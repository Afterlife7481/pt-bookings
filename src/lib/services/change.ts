import { nanoid } from "nanoid";
import { eq, and, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, changeRequests, slots, clients } from "@/lib/db/schema";
import {
  CHANGE_TIMEOUT_MINUTES,
  addMinutes,
  isInactiveBookingStatus,
  isWithinBookingDeadline,
  isWithinClientBookingWindow,
  nowIso,
  parseLocalDateTime,
} from "@/lib/constants";
import { assertSlotNotHeldByActiveBookingTx, getBookingDetailForTrainer } from "./bookings";
import { getAvailableSlotsForChange } from "./templates";
import { getTrainerSettings } from "./settings";
import { assertClientCanUseSlotLocation } from "./locations";
import { getTrainerById } from "./trainers";
import {
  sendWhatsAppSessionChangedToClient,
  sendWhatsAppSessionChangedToTrainer,
} from "@/lib/whatsapp";

export async function expireStaleChangeRequests() {
  const db = getDb();
  const now = nowIso();

  const stale = await db
    .select()
    .from(changeRequests)
    .where(
      and(
        eq(changeRequests.status, "browsing"),
        lt(changeRequests.expiresAt, now),
      ),
    );

  for (const req of stale) {
    await revertChangeRequest(req.id);
  }

  return stale.length;
}

async function revertChangeRequest(changeRequestId: string) {
  const db = getDb();
  const req = await db.query.changeRequests.findFirst({
    where: eq(changeRequests.id, changeRequestId),
  });
  if (!req || req.status !== "browsing") return;

  await db
    .update(changeRequests)
    .set({ status: "expired", updatedAt: nowIso() })
    .where(eq(changeRequests.id, changeRequestId));

  await db
    .update(bookings)
    .set({ status: "confirmed", updatedAt: nowIso() })
    .where(eq(bookings.id, req.bookingId));

  await db
    .update(slots)
    .set({ status: "booked" })
    .where(eq(slots.id, req.fromSlotId));
}

export async function abortChangeRequest(changeRequestId: string) {
  await revertChangeRequest(changeRequestId);
}

export async function abortChangeByBookingToken(bookingToken: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, bookingToken),
  });
  if (!booking) throw new Error("Booking not found");

  const req = await db.query.changeRequests.findFirst({
    where: and(
      eq(changeRequests.bookingId, booking.id),
      eq(changeRequests.status, "browsing"),
    ),
  });

  if (req) {
    await revertChangeRequest(req.id);
    return;
  }

  if (booking.status === "pending_change" && booking.slotId) {
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

export type StartChangeResult =
  | {
      changeRequestId: string;
      availableSlots: Awaited<ReturnType<typeof getAvailableSlotsForChange>>;
      noSlotsAvailable: false;
    }
  | {
      changeRequestId: null;
      availableSlots: [];
      noSlotsAvailable: true;
    };

export async function startChangeRequest(
  bookingToken: string,
): Promise<StartChangeResult> {
  await expireStaleChangeRequests();
  const db = getDb();

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, bookingToken),
  });
  if (!booking || isInactiveBookingStatus(booking.status)) {
    throw new Error("Booking not found");
  }
  if (!booking.slotId) {
    throw new Error("Booking not found");
  }

  const slot = await db.query.slots.findFirst({
    where: eq(slots.id, booking.slotId),
  });
  if (!slot) throw new Error("Slot not found");

  const { cancelDeadlineHours } = await getTrainerSettings(booking.trainerId);

  if (
    isWithinBookingDeadline(slot.startAt, cancelDeadlineHours) &&
    booking.status !== "pending_change"
  ) {
    const id = nanoid();
    await db.insert(changeRequests).values({
      id,
      trainerId: booking.trainerId,
      bookingId: booking.id,
      fromSlotId: booking.slotId,
      status: "blocked",
      expiresAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    throw new Error(
      `Changes are not allowed within ${cancelDeadlineHours} hours of your session. Please contact your trainer.`,
    );
  }

  const availableSlots = await getAvailableSlotsForChange(
    booking.trainerId,
    booking.slotId,
    slot.startAt,
    booking.clientId,
  );

  const existing = await db.query.changeRequests.findFirst({
    where: and(
      eq(changeRequests.bookingId, booking.id),
      eq(changeRequests.status, "browsing"),
    ),
  });

  if (availableSlots.length === 0) {
    if (existing) {
      await revertChangeRequest(existing.id);
    }
    return {
      changeRequestId: null,
      availableSlots: [],
      noSlotsAvailable: true,
    };
  }

  if (existing) {
    return {
      changeRequestId: existing.id,
      availableSlots,
      noSlotsAvailable: false,
    };
  }

  const changeRequestId = nanoid();
  const ts = nowIso();

  await db
    .update(bookings)
    .set({ status: "pending_change", updatedAt: ts })
    .where(eq(bookings.id, booking.id));

  await db
    .update(slots)
    .set({ status: "pending_change" })
    .where(eq(slots.id, booking.slotId));

  await db.insert(changeRequests).values({
    id: changeRequestId,
    trainerId: booking.trainerId,
    bookingId: booking.id,
    fromSlotId: booking.slotId,
    status: "browsing",
    expiresAt: addMinutes(ts, CHANGE_TIMEOUT_MINUTES),
    createdAt: ts,
    updatedAt: ts,
  });

  return { changeRequestId, availableSlots, noSlotsAvailable: false };
}

export async function confirmChange(
  changeRequestId: string,
  toSlotId: string,
) {
  await expireStaleChangeRequests();
  const db = getDb();

  const req = await db.query.changeRequests.findFirst({
    where: eq(changeRequests.id, changeRequestId),
  });
  if (!req || req.status !== "browsing") {
    throw new Error("Change request is no longer active");
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, req.bookingId),
  });
  if (!booking) throw new Error("Booking not found");

  const targetSlot = await db.query.slots.findFirst({
    where: eq(slots.id, toSlotId),
  });
  if (!targetSlot) throw new Error("Selected slot is no longer available");

  await assertClientCanUseSlotLocation(booking.clientId, targetSlot.locationId);

  const { clientBookingWindowWeeks } = await getTrainerSettings(booking.trainerId);
  if (!isWithinClientBookingWindow(targetSlot.startAt, clientBookingWindowWeeks)) {
    throw new Error("Selected slot is outside your booking window");
  }

  const result = await db.transaction(async (tx) => {
    const reqRow = await tx.query.changeRequests.findFirst({
      where: eq(changeRequests.id, changeRequestId),
    });
    if (!reqRow || reqRow.status !== "browsing") {
      throw new Error("Change request is no longer active");
    }

    const toSlotRow = await tx.query.slots.findFirst({
      where: eq(slots.id, toSlotId),
    });
    if (!toSlotRow || toSlotRow.status !== "available") {
      throw new Error("Selected slot is no longer available");
    }

    const bookingRow = await tx.query.bookings.findFirst({
      where: eq(bookings.id, reqRow.bookingId),
    });
    if (!bookingRow) throw new Error("Booking not found");

    await assertSlotNotHeldByActiveBookingTx(tx, toSlotId, bookingRow.id);

    const ts = nowIso();
    const fromSlotId = reqRow.fromSlotId;

    await tx
      .update(bookings)
      .set({
        slotId: toSlotId,
        sessionStartAt: toSlotRow.startAt,
        status: "confirmed",
        updatedAt: ts,
      })
      .where(eq(bookings.id, bookingRow.id));

    const claim = await tx
      .update(slots)
      .set({ status: "booked" })
      .where(and(eq(slots.id, toSlotId), eq(slots.status, "available")))
      .returning({ id: slots.id });
    if (claim.length === 0) {
      throw new Error("Selected slot is no longer available");
    }

    await tx
      .update(slots)
      .set({ status: "available" })
      .where(eq(slots.id, fromSlotId));

    await tx
      .update(changeRequests)
      .set({
        toSlotId,
        status: "confirmed",
        updatedAt: ts,
      })
      .where(eq(changeRequests.id, changeRequestId));

    return { bookingId: bookingRow.id, fromSlotId, toSlotId };
  });

  const [client, trainer, fromSlot, toSlot] = await Promise.all([
    db.query.clients.findFirst({ where: eq(clients.id, booking.clientId) }),
    getTrainerById(booking.trainerId),
    db.query.slots.findFirst({ where: eq(slots.id, result.fromSlotId) }),
    db.query.slots.findFirst({ where: eq(slots.id, result.toSlotId) }),
  ]);

  if (client && trainer && fromSlot && toSlot) {
    await sendWhatsAppSessionChangedToTrainer({
      trainerId: booking.trainerId,
      clientId: client.id,
      clientName: client.name,
      trainerEmail: trainer.email,
      fromSlotStartAt: fromSlot.startAt,
      fromSlotEndAt: fromSlot.endAt,
      toSlotStartAt: toSlot.startAt,
      toSlotEndAt: toSlot.endAt,
    });
    await sendWhatsAppSessionChangedToClient({
      trainerId: booking.trainerId,
      clientId: client.id,
      phone: client.phone,
      clientName: client.name,
      bookingToken: booking.token,
      slotStartAt: toSlot.startAt,
      slotEndAt: toSlot.endAt,
    });
  }

  return result;
}

export async function getChangeRequestForBooking(bookingToken: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, bookingToken),
  });
  if (!booking) return null;

  return db.query.changeRequests.findFirst({
    where: and(
      eq(changeRequests.bookingId, booking.id),
      eq(changeRequests.status, "browsing"),
    ),
  });
}

export async function listAvailableSlotsForTrainerChange(
  trainerId: string,
  bookingId: string,
) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainerId)),
  });
  if (!booking) throw new Error("Booking not found");
  if (isInactiveBookingStatus(booking.status)) {
    throw new Error("Cannot change an inactive session");
  }
  if (!booking.slotId) throw new Error("Booking has no slot");

  const slot = await db.query.slots.findFirst({
    where: eq(slots.id, booking.slotId),
  });
  if (!slot) throw new Error("Slot not found");

  if (parseLocalDateTime(slot.startAt).getTime() < Date.now()) {
    throw new Error("Cannot change a past session");
  }

  return getAvailableSlotsForChange(
    trainerId,
    booking.slotId,
    slot.startAt,
    booking.clientId,
  );
}

export async function moveBookingForTrainer(
  trainerId: string,
  bookingId: string,
  toSlotId: string,
) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainerId)),
  });
  if (!booking) throw new Error("Booking not found");
  if (isInactiveBookingStatus(booking.status)) {
    throw new Error("Cannot change an inactive session");
  }
  if (!booking.slotId) throw new Error("Booking has no slot");

  const fromSlot = await db.query.slots.findFirst({
    where: eq(slots.id, booking.slotId),
  });
  if (!fromSlot) throw new Error("Slot not found");

  if (parseLocalDateTime(fromSlot.startAt).getTime() < Date.now()) {
    throw new Error("Cannot change a past session");
  }

  if (booking.slotId === toSlotId) {
    throw new Error("Session is already at that time");
  }

  const targetSlot = await db.query.slots.findFirst({
    where: and(eq(slots.id, toSlotId), eq(slots.trainerId, trainerId)),
  });
  if (!targetSlot || targetSlot.status !== "available") {
    throw new Error("Selected slot is no longer available");
  }

  await assertClientCanUseSlotLocation(
    booking.clientId,
    targetSlot.locationId,
    "trainer",
  );

  const { clientBookingWindowWeeks } = await getTrainerSettings(trainerId);
  if (!isWithinClientBookingWindow(targetSlot.startAt, clientBookingWindowWeeks)) {
    throw new Error("Selected slot is outside the client booking window");
  }

  await abortChangeByBookingToken(booking.token);

  const fromSlotId = booking.slotId;

  const result = await db.transaction(async (tx) => {
    const bookingRow = await tx.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
    if (!bookingRow || isInactiveBookingStatus(bookingRow.status)) {
      throw new Error("Booking not found");
    }
    if (!bookingRow.slotId) throw new Error("Booking has no slot");

    const toSlotRow = await tx.query.slots.findFirst({
      where: eq(slots.id, toSlotId),
    });
    if (!toSlotRow || toSlotRow.status !== "available") {
      throw new Error("Selected slot is no longer available");
    }

    await assertSlotNotHeldByActiveBookingTx(tx, toSlotId, bookingRow.id);

    const ts = nowIso();

    await tx
      .update(bookings)
      .set({
        slotId: toSlotId,
        sessionStartAt: toSlotRow.startAt,
        status: "confirmed",
        updatedAt: ts,
      })
      .where(eq(bookings.id, bookingRow.id));

    const claim = await tx
      .update(slots)
      .set({ status: "booked" })
      .where(and(eq(slots.id, toSlotId), eq(slots.status, "available")))
      .returning({ id: slots.id });
    if (claim.length === 0) {
      throw new Error("Selected slot is no longer available");
    }

    await tx
      .update(slots)
      .set({ status: "available" })
      .where(eq(slots.id, fromSlotId));

    return { fromSlotId, toSlotId };
  });

  const [client, fromSlotAfter, toSlotAfter] = await Promise.all([
    db.query.clients.findFirst({ where: eq(clients.id, booking.clientId) }),
    db.query.slots.findFirst({ where: eq(slots.id, result.fromSlotId) }),
    db.query.slots.findFirst({ where: eq(slots.id, result.toSlotId) }),
  ]);

  if (client && fromSlotAfter && toSlotAfter) {
    await sendWhatsAppSessionChangedToClient({
      trainerId,
      clientId: client.id,
      phone: client.phone,
      clientName: client.name,
      bookingToken: booking.token,
      slotStartAt: toSlotAfter.startAt,
      slotEndAt: toSlotAfter.endAt,
    });
  }

  const detail = await getBookingDetailForTrainer(trainerId, bookingId);
  if (!detail) throw new Error("Booking not found");
  return detail;
}
