import { nanoid } from "nanoid";
import { eq, asc, and, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, clients, slots, changeRequests, locations } from "@/lib/db/schema";
import {
  bookingUrl,
  isWithinBookingDeadline,
  isInactiveBookingStatus,
  isWithinClientBookingWindow,
  nowIso,
  type SessionPaymentType,
} from "@/lib/constants";
import { isWallClockPast, wallClockToUtcMs } from "@/lib/zoned-time";
import {
  sendConfirmationEmail,
  sendWhatsAppConfirmation,
  sendWhatsAppInvoice,
  sendInvoiceEmail,
  sendWhatsAppSessionCanceledToTrainer,
} from "@/lib/whatsapp";
import { assertWhatsAppPhone, validateWhatsAppPhone } from "@/lib/whatsapp-link";
import {
  hasClientEmail,
  parseNotifyChannels,
  type NotifyChannel,
} from "@/lib/notify-channels";
import { resolveMoneyCurrency } from "@/lib/currency";
import { getTrainerSettings } from "./settings";
import { getTrainerById } from "./trainers";
import {
  paymentDetailsFromMethods,
  hasPaymentDetailsForInvoice,
} from "@/lib/payments";
import { getClientByToken } from "./clients";
import { assertClientCanUseSlotLocation } from "./locations";
import { abortChangeByBookingToken } from "./change";
import {
  assertTrainerPaymentMethodName,
  listPaymentMethods,
} from "./payment-methods";

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
  if (!slot || slot.status !== "available" || slot.trainerId !== trainerId) {
    throw new Error("Slot is not available");
  }

  const bookingClient = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!bookingClient || bookingClient.trainerId !== trainerId) {
    throw new Error("Client not found");
  }

  const trainerSettings = await getTrainerSettings(trainerId);
  const bookingCurrency = resolveMoneyCurrency({
    clientCurrency: bookingClient.currency,
    trainerCurrency: trainerSettings.currency,
  });

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
        status: "booked",
        override36h: false,
        isRecurring,
        sessionPrice: bookingClient.sessionPrice,
        currency: bookingCurrency,
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

  let whatsappUrl: string | null = null;

  if (sendConfirmation) {
    const client = bookingClient;
    if (client && validateWhatsAppPhone(client.phone).ok) {
      const draft = await sendWhatsAppConfirmation({
        trainerId,
        clientId,
        phone: client.phone,
        bookingToken: token,
        slotStartAt,
        slotEndAt,
        clientName: client.name,
      });
      whatsappUrl = draft.sendUrl;
      const ts = nowIso();
      await db
        .update(bookings)
        .set({ confirmationSentAt: ts, updatedAt: ts })
        .where(eq(bookings.id, bookingId));
    }
  }

  return { bookingId, token, whatsappUrl };
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
        .set({ status: "booked", updatedAt: ts })
        .where(eq(bookings.id, booking.id));
      await db
        .update(slots)
        .set({ status: "booked" })
        .where(eq(slots.id, activeChange.fromSlotId));
    } else if (booking.slotId) {
      const ts = nowIso();
      await db
        .update(bookings)
        .set({ status: "booked", updatedAt: ts })
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

  const { cancelDeadlineHours, timezone } = await getTrainerSettings(booking.trainerId);
  if (
    isWithinBookingDeadline(slot.startAt, cancelDeadlineHours, timezone)
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

  const rows = await db
    .select({
      booking: bookings,
      slot: slots,
    })
    .from(bookings)
    .leftJoin(slots, eq(bookings.slotId, slots.id))
    .where(eq(bookings.clientId, clientId))
    .orderBy(asc(bookings.sessionStartAt));

  const trainerId = rows[0]?.booking.trainerId;
  const timezone = trainerId
    ? (await getTrainerSettings(trainerId)).timezone
    : "Europe/London";

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

    const isPast = isWallClockPast(startAt, timezone);
    if (isInactiveBookingStatus(row.booking.status) || isPast) {
      history.push(session);
    } else {
      upcoming.push(session);
    }
  }

  history.sort(
    (a, b) => wallClockToUtcMs(b.startAt, timezone) - wallClockToUtcMs(a.startAt, timezone),
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

  const { clientBookingWindowWeeks, timezone } = await getTrainerSettings(client.trainerId);
  if (!isWithinClientBookingWindow(slot.startAt, clientBookingWindowWeeks, timezone)) {
    throw new Error("This slot is outside your booking window");
  }

  return createBookingForSlot({
    slotId,
    clientId: client.id,
    trainerId: client.trainerId,
    isRecurring: false,
    // Confirmation WhatsApp is trainer-initiated from the schedule/session UI.
    sendConfirmation: false,
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

export async function sendConfirmationForBooking(
  bookingId: string,
  channelsInput?: unknown,
) {
  const channels = parseNotifyChannels(channelsInput ?? ["whatsapp"]);
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "canceled" || booking.status === "voided") {
    throw new Error("Cannot send confirmation for a canceled or voided session");
  }

  const slot = booking.slotId
    ? await db.query.slots.findFirst({
        where: eq(slots.id, booking.slotId),
      })
    : null;
  if (!slot) throw new Error("Session slot not found");

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, booking.clientId),
  });
  if (!client) throw new Error("Client not found");

  const wantEmail = channels.includes("email");
  const wantWhatsApp = channels.includes("whatsapp");

  if (wantEmail && !hasClientEmail(client.email)) {
    throw new Error(
      "This client has no email address. Add one on their profile, or send by WhatsApp instead.",
    );
  }
  if (wantWhatsApp) {
    assertWhatsAppPhone(client.phone);
  }

  let whatsappUrl: string | null = null;
  const sentVia: NotifyChannel[] = [];

  if (wantEmail) {
    const [trainer, settings] = await Promise.all([
      getTrainerById(booking.trainerId),
      getTrainerSettings(booking.trainerId),
    ]);
    await sendConfirmationEmail({
      trainerId: booking.trainerId,
      clientId: client.id,
      email: client.email,
      bookingToken: booking.token,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      clientName: client.name,
      replyTo: trainer?.email ?? settings.email,
    });
    sentVia.push("email");
  }

  if (wantWhatsApp) {
    const draft = await sendWhatsAppConfirmation({
      trainerId: booking.trainerId,
      clientId: client.id,
      phone: client.phone,
      bookingToken: booking.token,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      clientName: client.name,
    });
    whatsappUrl = draft.sendUrl;
    sentVia.push("whatsapp");
  }

  const ts = nowIso();
  await db
    .update(bookings)
    .set({ confirmationSentAt: ts, updatedAt: ts })
    .where(eq(bookings.id, bookingId));

  const detail = await getBookingDetailForTrainer(booking.trainerId, bookingId);
  if (!detail) return null;
  return { ...detail, whatsappUrl, sentVia };
}

export type TrainerBookingDetail = {
  booking: {
    id: string;
    token: string;
    status: string;
    isRecurring: boolean;
    sessionPaid: boolean;
    paymentType: SessionPaymentType | null;
    sessionPrice: number | null;
    currency: string | null;
    invoiceSentAt: string | null;
    confirmationSentAt: string | null;
    sessionStartAt: string;
    createdAt: string;
    updatedAt: string;
    /** Absolute client-facing session URL, built server-side from APP_BASE_URL. */
    sessionUrl: string;
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
    preferredNotifyChannel: "email" | "whatsapp";
    sessionPrice: number | null;
    currency: string | null;
  };
  /** Resolved currency for display: booking → client → trainer. */
  currency: string;
  paymentDetailsReady: boolean;
  paymentMethods: { id: string; name: string }[];
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

  const settings = await getTrainerSettings(trainerId);
  const paymentMethods = await listPaymentMethods(trainerId);
  const paymentDetailsReady = hasPaymentDetailsForInvoice(
    paymentDetailsFromMethods(paymentMethods),
  );

  const currency = resolveMoneyCurrency({
    bookingCurrency: booking.currency,
    clientCurrency: client.currency,
    trainerCurrency: settings.currency,
  });

  return {
    booking: {
      id: booking.id,
      token: booking.token,
      status: booking.status,
      isRecurring: booking.isRecurring,
      sessionPaid: booking.sessionPaid,
      paymentType: booking.paymentType,
      sessionPrice: booking.sessionPrice ?? null,
      currency: booking.currency ?? null,
      invoiceSentAt: booking.invoiceSentAt ?? null,
      confirmationSentAt: booking.confirmationSentAt ?? null,
      sessionStartAt: booking.sessionStartAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      sessionUrl: bookingUrl(booking.token),
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
      preferredNotifyChannel:
        client.preferredNotifyChannel === "email" ? "email" : "whatsapp",
      sessionPrice: client.sessionPrice,
      currency: client.currency ?? null,
    },
    currency,
    paymentDetailsReady,
    paymentMethods: paymentMethods.map((method) => ({
      id: method.id,
      name: method.name,
    })),
  };
}

export async function updateBookingPaymentForTrainer(
  trainerId: string,
  bookingId: string,
  updates: {
    sessionPaid?: boolean;
    paymentType?: SessionPaymentType | null;
    sessionPrice?: number | null;
  },
) {
  const booking = await getBookingForTrainer(trainerId, bookingId);
  if (!booking) throw new Error("Booking not found");

  const patch: {
    sessionPaid?: boolean;
    paymentType?: SessionPaymentType | null;
    sessionPrice?: number | null;
    invoiceSentAt?: string | null;
    updatedAt: string;
  } = { updatedAt: nowIso() };

  if (updates.sessionPrice !== undefined) {
    if (
      updates.sessionPrice != null &&
      (!Number.isInteger(updates.sessionPrice) || updates.sessionPrice < 0)
    ) {
      throw new Error("Session price must be zero or greater");
    }
    patch.sessionPrice = updates.sessionPrice;
  }

  if (updates.sessionPaid !== undefined) {
    if (updates.sessionPaid) {
      const paymentType =
        updates.paymentType !== undefined
          ? updates.paymentType
          : booking.paymentType;
      if (!paymentType) {
        throw new Error("Select a payment method before marking as paid");
      }
      patch.sessionPaid = true;
      patch.paymentType = await assertTrainerPaymentMethodName(
        trainerId,
        paymentType,
      );
    } else {
      patch.sessionPaid = false;
      patch.invoiceSentAt = null;
    }
  } else if (updates.paymentType !== undefined) {
    if (updates.paymentType == null) {
      patch.paymentType = null;
    } else {
      patch.paymentType = await assertTrainerPaymentMethodName(
        trainerId,
        updates.paymentType,
      );
    }
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

  if (booking.status === "pending_change") {
    await abortChangeByBookingToken(booking.token);
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
  const { timezone } = await getTrainerSettings(trainerId);

  if (!isWallClockPast(sessionStartAt, timezone)) {
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

export async function sendInvoiceForBooking(
  bookingId: string,
  channelsInput: unknown = ["whatsapp"],
) {
  const channels = parseNotifyChannels(channelsInput);
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "voided") {
    throw new Error("Cannot send invoice for a voided session");
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

  const amountPence = booking.sessionPrice ?? client.sessionPrice;
  if (amountPence == null) {
    throw new Error("Set a session price for this session before sending an invoice");
  }

  const settings = await getTrainerSettings(booking.trainerId);
  const currency = resolveMoneyCurrency({
    bookingCurrency: booking.currency,
    clientCurrency: client.currency,
    trainerCurrency: settings.currency,
  });
  const paymentMethods = await listPaymentMethods(booking.trainerId);
  const paymentDetails = paymentDetailsFromMethods(paymentMethods);
  if (!hasPaymentDetailsForInvoice(paymentDetails)) {
    throw new Error(
      "Add payment methods in Settings → Payment details before sending an invoice",
    );
  }

  const slotStartAt = slot?.startAt ?? booking.sessionStartAt;
  const slotEndAt = slot?.endAt ?? null;
  const wantEmail = channels.includes("email");
  const wantWhatsApp = channels.includes("whatsapp");

  if (wantEmail && !hasClientEmail(client.email)) {
    throw new Error(
      "This client has no email address. Add one on their profile, or send by WhatsApp instead.",
    );
  }
  if (wantWhatsApp) {
    assertWhatsAppPhone(client.phone);
  }

  let whatsappUrl: string | null = null;
  const sentVia: NotifyChannel[] = [];

  if (wantEmail) {
    const trainer = await getTrainerById(booking.trainerId);
    await sendInvoiceEmail({
      trainerId: booking.trainerId,
      clientId: client.id,
      email: client.email,
      clientName: client.name,
      slotStartAt,
      slotEndAt,
      amountPence,
      currency,
      paymentDetails,
      replyTo: trainer?.email ?? settings.email,
    });
    sentVia.push("email");
  }

  if (wantWhatsApp) {
    const draft = await sendWhatsAppInvoice({
      trainerId: booking.trainerId,
      clientId: client.id,
      phone: client.phone,
      clientName: client.name,
      slotStartAt,
      slotEndAt,
      amountPence,
      currency,
      paymentDetails,
    });
    whatsappUrl = draft.sendUrl;
    sentVia.push("whatsapp");
  }

  const ts = nowIso();
  await db
    .update(bookings)
    .set({ invoiceSentAt: ts, updatedAt: ts })
    .where(eq(bookings.id, bookingId));

  const detail = await getBookingDetailForTrainer(booking.trainerId, bookingId);
  if (!detail) return null;
  return { ...detail, whatsappUrl, sentVia };
}

const SESSION_LIST_LIMIT = 100;

/** Upcoming sessions first, then recent past — capped for the sessions list. */
export async function listBookings(trainerId: string) {
  const db = getDb();
  const { timezone } = await getTrainerSettings(trainerId);

  const rows = await db
    .select({
      booking: bookings,
      slot: slots,
      client: clients,
    })
    .from(bookings)
    .innerJoin(slots, eq(bookings.slotId, slots.id))
    .innerJoin(clients, eq(bookings.clientId, clients.id))
    .where(
      and(
        eq(bookings.trainerId, trainerId),
        ne(bookings.status, "canceled"),
      ),
    )
    .orderBy(asc(slots.startAt));

  const upcoming: typeof rows = [];
  const past: typeof rows = [];

  for (const row of rows) {
    if (!isWallClockPast(row.slot.startAt, timezone)) {
      upcoming.push(row);
    } else {
      past.push(row);
    }
  }

  past.reverse();

  return [...upcoming, ...past].slice(0, SESSION_LIST_LIMIT);
}
