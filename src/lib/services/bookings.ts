import { nanoid } from "nanoid";
import { eq, asc, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, clients, slots, changeRequests, locations } from "@/lib/db/schema";
import {
  isWithinBookingDeadline,
  isInactiveBookingStatus,
  isWithinClientBookingWindow,
  nowIso,
  parseLocalDateTime,
  type SessionPaymentType,
} from "@/lib/constants";
import { sendWhatsAppConfirmation, sendWhatsAppInvoice, sendWhatsAppSessionCanceledToTrainer } from "@/lib/whatsapp";
import { getTrainerSettings } from "./settings";
import { getTrainerById } from "./trainers";
import {
  getPaymentDetailsForMessage,
  hasBankTransferDetails,
} from "@/lib/payments";
import { getClientByToken } from "./clients";
import { assertClientCanUseSlotLocation } from "./locations";

type DbTx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export async function assertSlotNotHeldByActiveBookingTx(
  tx: DbTx,
  slotId: string,
  excludeBookingId?: string,
) {
  const existing = await tx.query.bookings.findFirst({
    where: eq(bookings.slotId, slotId),
  });
  if (!existing || existing.id === excludeBookingId) return;
  if (isInactiveBookingStatus(existing.status)) return;
  throw new Error("Slot is not available");
}

export async function assertSlotNotHeldByActiveBooking(
  db: ReturnType<typeof getDb>,
  slotId: string,
  excludeBookingId?: string,
) {
  const existing = await db.query.bookings.findFirst({
    where: eq(bookings.slotId, slotId),
  });
  if (!existing || existing.id === excludeBookingId) return;
  if (isInactiveBookingStatus(existing.status)) return;
  throw new Error("Slot is not available");
}

export async function createBookingForSlot(params: {
  slotId: string;
  clientId: string;
  trainerId: string;
  isRecurring?: boolean;
  sendConfirmation?: boolean;
  locationValidation?: "client" | "trainer";
}) {
  const db = getDb();
  const {
    slotId,
    clientId,
    trainerId,
    isRecurring = false,
    sendConfirmation = true,
    locationValidation = "client",
  } = params;

  const slot = await db.query.slots.findFirst({
    where: eq(slots.id, slotId),
  });
  if (!slot || slot.status !== "available") {
    throw new Error("Slot is not available");
  }

  await assertClientCanUseSlotLocation(
    clientId,
    slot.locationId,
    locationValidation,
  );

  const { bookingId, token, slotStartAt, slotEndAt } = await db.transaction(
    async (tx) => {
      const slot = await tx.query.slots.findFirst({
        where: eq(slots.id, slotId),
      });
      if (!slot || slot.status !== "available") {
        throw new Error("Slot is not available");
      }

      const now = nowIso();
      if (
        slot.heldForClientId &&
        slot.heldForClientId !== clientId &&
        slot.holdExpiresAt &&
        slot.holdExpiresAt >= now
      ) {
        throw new Error("This slot is reserved for another client");
      }

      await assertSlotNotHeldByActiveBookingTx(tx, slotId);

      const newBookingId = nanoid();
      const newToken = nanoid(12);
      const ts = nowIso();

      await tx.insert(bookings).values({
        id: newBookingId,
        trainerId,
        slotId,
        sessionStartAt: slot.startAt,
        clientId,
        token: newToken,
        status: "confirmed",
        override36h: false,
        isRecurring,
        createdAt: ts,
        updatedAt: ts,
      });

      const claim = await tx
        .update(slots)
        .set({
          status: "booked",
          heldForClientId: null,
          holdExpiresAt: null,
        })
        .where(and(eq(slots.id, slotId), eq(slots.status, "available")))
        .returning({ id: slots.id });

      if (claim.length === 0) {
        throw new Error("Slot is not available");
      }

      return {
        bookingId: newBookingId,
        token: newToken,
        slotStartAt: slot.startAt,
        slotEndAt: slot.endAt,
      };
    },
  );

  if (sendConfirmation) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });
    if (client) {
      await sendWhatsAppConfirmation({
        trainerId,
        clientId,
        phone: client.phone,
        bookingToken: token,
        slotStartAt,
        slotEndAt,
        clientName: client.name,
      });
    }
  }

  return { bookingId, token };
}

export async function releaseSlot(slotId: string) {
  const db = getDb();
  await db
    .update(slots)
    .set({ status: "available" })
    .where(eq(slots.id, slotId));
}

export async function cancelBooking(bookingId: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) throw new Error("Booking not found");
  if (!booking.slotId) throw new Error("Booking has no slot");

  const slot = await db.query.slots.findFirst({
    where: eq(slots.id, booking.slotId),
  });
  if (!slot) throw new Error("Slot not found");

  await db
    .update(bookings)
    .set({
      status: "canceled",
      slotId: null,
      sessionStartAt: slot.startAt,
      updatedAt: nowIso(),
    })
    .where(eq(bookings.id, bookingId));

  await releaseSlot(slot.id);

  return booking;
}

export async function cancelBookingByToken(bookingToken: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, bookingToken),
  });
  if (!booking || isInactiveBookingStatus(booking.status)) {
    throw new Error("Booking not found");
  }

  if (booking.status === "pending_change") {
    const activeChange = await db.query.changeRequests.findFirst({
      where: and(
        eq(changeRequests.bookingId, booking.id),
        eq(changeRequests.status, "browsing"),
      ),
    });
    if (activeChange) {
      const ts = nowIso();
      await db
        .update(changeRequests)
        .set({ status: "expired", updatedAt: ts })
        .where(eq(changeRequests.id, activeChange.id));
      await db
        .update(bookings)
        .set({ status: "confirmed", updatedAt: ts })
        .where(eq(bookings.id, booking.id));
      await db
        .update(slots)
        .set({ status: "booked" })
        .where(eq(slots.id, activeChange.fromSlotId));
    } else if (booking.slotId) {
      const ts = nowIso();
      await db
        .update(bookings)
        .set({ status: "confirmed", updatedAt: ts })
        .where(eq(bookings.id, booking.id));
      await db
        .update(slots)
        .set({ status: "booked" })
        .where(eq(slots.id, booking.slotId));
    }
  }
  if (!booking.slotId) throw new Error("Booking not found");

  const slot = await db.query.slots.findFirst({
    where: eq(slots.id, booking.slotId),
  });
  if (!slot) throw new Error("Slot not found");

  const { cancelDeadlineHours } = await getTrainerSettings(booking.trainerId);
  if (
    isWithinBookingDeadline(slot.startAt, cancelDeadlineHours)
  ) {
    throw new Error(
      `Cancellations are not allowed within ${cancelDeadlineHours} hours of your session. Please contact your trainer.`,
    );
  }

  await cancelBooking(booking.id);

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, booking.clientId),
  });
  const trainer = await getTrainerById(booking.trainerId);
  if (client && trainer) {
    await sendWhatsAppSessionCanceledToTrainer({
      trainerId: booking.trainerId,
      clientId: client.id,
      clientName: client.name,
      trainerEmail: trainer.email,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
    });
  }

  return { clientHomeToken: client?.token ?? null };
}

export type ClientSession = {
  bookingId: string;
  bookingToken: string;
  status: string;
  isRecurring: boolean;
  startAt: string;
  endAt: string | null;
};

export async function listClientSessions(clientId: string): Promise<{
  upcoming: ClientSession[];
  history: ClientSession[];
}> {
  const db = getDb();
  const now = Date.now();

  const rows = await db
    .select({
      booking: bookings,
      slot: slots,
    })
    .from(bookings)
    .leftJoin(slots, eq(bookings.slotId, slots.id))
    .where(eq(bookings.clientId, clientId))
    .orderBy(asc(bookings.sessionStartAt));

  const upcoming: ClientSession[] = [];
  const history: ClientSession[] = [];

  for (const row of rows) {
    const startAt = row.slot?.startAt ?? row.booking.sessionStartAt;
    const session: ClientSession = {
      bookingId: row.booking.id,
      bookingToken: row.booking.token,
      status: row.booking.status,
      isRecurring: row.booking.isRecurring,
      startAt,
      endAt: row.slot?.endAt ?? null,
    };

    const isPast = parseLocalDateTime(startAt).getTime() < now;
    if (isInactiveBookingStatus(row.booking.status) || isPast) {
      history.push(session);
    } else {
      upcoming.push(session);
    }
  }

  history.sort(
    (a, b) =>
      parseLocalDateTime(b.startAt).getTime() -
      parseLocalDateTime(a.startAt).getTime(),
  );

  return { upcoming, history };
}

export async function bookSlotByClientToken(clientToken: string, slotId: string) {
  const client = await getClientByToken(clientToken);
  if (!client) throw new Error("Client not found");

  const db = getDb();
  const slot = await db.query.slots.findFirst({ where: eq(slots.id, slotId) });
  if (!slot) throw new Error("Slot not found");
  if (slot.trainerId !== client.trainerId) throw new Error("Slot not found");

  const { clientBookingWindowWeeks } = await getTrainerSettings(client.trainerId);
  if (!isWithinClientBookingWindow(slot.startAt, clientBookingWindowWeeks)) {
    throw new Error("This slot is outside your booking window");
  }

  return createBookingForSlot({
    slotId,
    clientId: client.id,
    trainerId: client.trainerId,
    isRecurring: false,
    sendConfirmation: true,
  });
}

export async function getBookingByToken(token: string) {
  const db = getDb();
  const row = await db.query.bookings.findFirst({
    where: eq(bookings.token, token),
  });
  if (!row) return null;

  const slot = row.slotId
    ? await db.query.slots.findFirst({
        where: eq(slots.id, row.slotId),
      })
    : null;
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, row.clientId),
  });

  return { booking: row, slot, client };
}

export async function sendConfirmationForBooking(bookingId: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) throw new Error("Booking not found");

  const slot = booking.slotId
    ? await db.query.slots.findFirst({
        where: eq(slots.id, booking.slotId),
      })
    : null;
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, booking.clientId),
  });

  if (slot && client) {
    await sendWhatsAppConfirmation({
      trainerId: booking.trainerId,
      clientId: client.id,
      phone: client.phone,
      bookingToken: booking.token,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      clientName: client.name,
    });
  }
}

export type TrainerBookingDetail = {
  booking: {
    id: string;
    token: string;
    status: string;
    isRecurring: boolean;
    sessionPaid: boolean;
    paymentType: SessionPaymentType | null;
    invoiceSentAt: string | null;
    sessionStartAt: string;
    createdAt: string;
    updatedAt: string;
  };
  slot: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  } | null;
  location: { id: string; name: string } | null;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    sessionPrice: number | null;
  };
};

async function getBookingForTrainer(trainerId: string, bookingId: string) {
  const db = getDb();
  return db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainerId)),
  });
}

export async function getBookingDetailForTrainer(
  trainerId: string,
  bookingId: string,
): Promise<TrainerBookingDetail | null> {
  const booking = await getBookingForTrainer(trainerId, bookingId);
  if (!booking) return null;

  const db = getDb();
  const slot = booking.slotId
    ? await db.query.slots.findFirst({
        where: eq(slots.id, booking.slotId),
      })
    : null;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, booking.clientId),
  });
  if (!client) return null;

  const location = slot?.locationId
    ? await db.query.locations.findFirst({
        where: eq(locations.id, slot.locationId),
      })
    : null;

  return {
    booking: {
      id: booking.id,
      token: booking.token,
      status: booking.status,
      isRecurring: booking.isRecurring,
      sessionPaid: booking.sessionPaid,
      paymentType: booking.paymentType,
      invoiceSentAt: booking.invoiceSentAt ?? null,
      sessionStartAt: booking.sessionStartAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    },
    slot: slot
      ? {
          id: slot.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          status: slot.status,
        }
      : null,
    location: location ? { id: location.id, name: location.name } : null,
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      sessionPrice: client.sessionPrice,
    },
  };
}

export async function updateBookingPaymentForTrainer(
  trainerId: string,
  bookingId: string,
  updates: {
    sessionPaid?: boolean;
    paymentType?: SessionPaymentType | null;
  },
) {
  const booking = await getBookingForTrainer(trainerId, bookingId);
  if (!booking) throw new Error("Booking not found");

  const patch: {
    sessionPaid?: boolean;
    paymentType?: SessionPaymentType | null;
    updatedAt: string;
  } = { updatedAt: nowIso() };

  if (updates.sessionPaid !== undefined) {
    patch.sessionPaid = updates.sessionPaid;
  }

  if (updates.paymentType !== undefined) {
    patch.paymentType = updates.paymentType;
  }

  const db = getDb();
  await db.update(bookings).set(patch).where(eq(bookings.id, bookingId));

  return getBookingDetailForTrainer(trainerId, bookingId);
}

export async function cancelBookingForTrainer(
  trainerId: string,
  bookingId: string,
) {
  const booking = await getBookingForTrainer(trainerId, bookingId);
  if (!booking) throw new Error("Booking not found");
  if (isInactiveBookingStatus(booking.status)) {
    throw new Error("Session is already inactive");
  }

  await cancelBooking(bookingId);
}

export async function voidBookingForTrainer(
  trainerId: string,
  bookingId: string,
) {
  const booking = await getBookingForTrainer(trainerId, bookingId);
  if (!booking) throw new Error("Booking not found");
  if (isInactiveBookingStatus(booking.status)) {
    throw new Error("Session is already inactive");
  }

  const db = getDb();
  const slot = booking.slotId
    ? await db.query.slots.findFirst({
        where: eq(slots.id, booking.slotId),
      })
    : null;
  const sessionStartAt = slot?.startAt ?? booking.sessionStartAt;

  if (parseLocalDateTime(sessionStartAt).getTime() >= Date.now()) {
    throw new Error(
      "Only past sessions can be voided. Cancel upcoming sessions instead.",
    );
  }

  await db
    .update(bookings)
    .set({
      status: "voided",
      updatedAt: nowIso(),
    })
    .where(eq(bookings.id, bookingId));

  return getBookingDetailForTrainer(trainerId, bookingId);
}

export async function sendInvoiceForBooking(bookingId: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "canceled" || booking.status === "voided") {
    throw new Error("Cannot send invoice for a canceled or voided session");
  }

  const slot = booking.slotId
    ? await db.query.slots.findFirst({
        where: eq(slots.id, booking.slotId),
      })
    : null;
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, booking.clientId),
  });
  if (!client) throw new Error("Client not found");

  if (client.sessionPrice == null) {
    throw new Error("Set a session price for this client before sending an invoice");
  }

  const settings = await getTrainerSettings(booking.trainerId);
  const paymentDetails = getPaymentDetailsForMessage(settings);
  if (!hasBankTransferDetails(paymentDetails)) {
    throw new Error(
      "Add bank account and sort code in Settings → Payment details before sending an invoice",
    );
  }

  const slotStartAt = slot?.startAt ?? booking.sessionStartAt;
  const slotEndAt = slot?.endAt ?? null;

  await sendWhatsAppInvoice({
    trainerId: booking.trainerId,
    clientId: client.id,
    phone: client.phone,
    clientName: client.name,
    slotStartAt,
    slotEndAt,
    amountPence: client.sessionPrice,
    paymentDetails,
  });

  const ts = nowIso();
  await db
    .update(bookings)
    .set({ invoiceSentAt: ts, updatedAt: ts })
    .where(eq(bookings.id, bookingId));

  return getBookingDetailForTrainer(booking.trainerId, bookingId);
}
