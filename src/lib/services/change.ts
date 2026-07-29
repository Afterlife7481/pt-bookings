import { nanoid } from "nanoid";
import { eq, and, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, changeRequests, slots, clients } from "@/lib/db/schema";
import {
  isInactiveBookingStatus,
  isWithinBookingDeadline,
  isWithinClientBookingWindow,
  nowIso,
} from "@/lib/constants";
import { assertSlotNotHeldByActiveBookingTx, getBookingDetailForTrainer } from "./bookings";
import { getAvailableSlotsForChange } from "./available-slots";
import { isWallClockPast } from "@/lib/zoned-time";
import { getTrainerSettings } from "./settings";
import { assertClientCanUseSlotLocation } from "./locations";
import { getTrainerById } from "./trainers";
import { sendWhatsAppSessionChangedToTrainer } from "@/lib/whatsapp";

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

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, req.bookingId),
  });

  await db
    .update(changeRequests)
    .set({ status: "expired", updatedAt: nowIso() })
    .where(eq(changeRequests.id, changeRequestId));

  if (!booking || isInactiveBookingStatus(booking.status)) {
    return;
  }

  await db
    .update(bookings)
    .set({ status: "booked", updatedAt: nowIso() })
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
      .set({ status: "booked", updatedAt: ts })
      .where(eq(bookings.id, booking.id));
    await db
      .update(slots)
      .set({ status: "booked" })
      .where(eq(slots.id, booking.slotId));
  }
}

export type StartChangeResult =
  | {
      changeRequestId: null;
      availableSlots: Awaited<ReturnType<typeof getAvailableSlotsForChange>>;
      noSlotsAvailable: false;
    }
  | {
      changeRequestId: null;
      availableSlots: [];
      noSlotsAvailable: true;
    };

/** List open slots for a client change — does not hold/tag the current booking. */
export async function startChangeRequest(
  bookingToken: string,
): Promise<StartChangeResult> {
  await expireStaleChangeRequests();
  // Clear any leftover browsing hold from the old change flow.
  await abortChangeByBookingToken(bookingToken).catch(() => undefined);

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

  const { cancelDeadlineHours, timezone } = await getTrainerSettings(
    booking.trainerId,
  );

  if (isWithinBookingDeadline(slot.startAt, cancelDeadlineHours, timezone)) {
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

  if (availableSlots.length === 0) {
    return {
      changeRequestId: null,
      availableSlots: [],
      noSlotsAvailable: true,
    };
  }

  return {
    changeRequestId: null,
    availableSlots,
    noSlotsAvailable: false,
  };
}

export async function confirmChange(bookingToken: string, toSlotId: string) {
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

  // Ensure leftover pending_change state is cleared before moving.
  if (booking.status === "pending_change") {
    await abortChangeByBookingToken(bookingToken);
  }

  const fromSlotId = booking.slotId;
  if (fromSlotId === toSlotId) {
    throw new Error("Session is already at that time");
  }

  const fromSlot = await db.query.slots.findFirst({
    where: eq(slots.id, fromSlotId),
  });
  if (!fromSlot) throw new Error("Slot not found");

  const { cancelDeadlineHours, clientBookingWindowWeeks, timezone } =
    await getTrainerSettings(booking.trainerId);

  if (isWithinBookingDeadline(fromSlot.startAt, cancelDeadlineHours, timezone)) {
    throw new Error(
      `Changes are not allowed within ${cancelDeadlineHours} hours of your session. Please contact your trainer.`,
    );
  }

  const targetSlot = await db.query.slots.findFirst({
    where: eq(slots.id, toSlotId),
  });
  if (!targetSlot) throw new Error("Selected slot is no longer available");
  if (targetSlot.trainerId !== booking.trainerId) {
    throw new Error("Selected slot is no longer available");
  }

  await assertClientCanUseSlotLocation(booking.clientId, targetSlot.locationId);

  if (
    !isWithinClientBookingWindow(
      targetSlot.startAt,
      clientBookingWindowWeeks,
      timezone,
    )
  ) {
    throw new Error("Selected slot is outside your booking window");
  }

  const changeRequestId = nanoid();
  const result = await db.transaction(async (tx) => {
    const bookingRow = await tx.query.bookings.findFirst({
      where: and(eq(bookings.id, booking.id), eq(bookings.token, bookingToken)),
    });
    if (!bookingRow || isInactiveBookingStatus(bookingRow.status)) {
      throw new Error("Booking not found");
    }
    if (!bookingRow.slotId) throw new Error("Booking not found");

    const toSlotRow = await tx.query.slots.findFirst({
      where: eq(slots.id, toSlotId),
    });
    if (
      !toSlotRow ||
      toSlotRow.status !== "available" ||
      toSlotRow.trainerId !== booking.trainerId
    ) {
      throw new Error("Selected slot is no longer available");
    }

    await assertSlotNotHeldByActiveBookingTx(tx, toSlotId, bookingRow.id);

    const ts = nowIso();
    const currentFromSlotId = bookingRow.slotId;

    await tx
      .update(bookings)
      .set({
        slotId: toSlotId,
        sessionStartAt: toSlotRow.startAt,
        status: "booked",
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
      .where(eq(slots.id, currentFromSlotId));

    await tx.insert(changeRequests).values({
      id: changeRequestId,
      trainerId: booking.trainerId,
      bookingId: bookingRow.id,
      fromSlotId: currentFromSlotId,
      toSlotId,
      status: "confirmed",
      expiresAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });

    return {
      bookingId: bookingRow.id,
      fromSlotId: currentFromSlotId,
      toSlotId,
    };
  });

  const [client, trainer, fromSlotRow, toSlot] = await Promise.all([
    db.query.clients.findFirst({ where: eq(clients.id, booking.clientId) }),
    getTrainerById(booking.trainerId),
    db.query.slots.findFirst({ where: eq(slots.id, result.fromSlotId) }),
    db.query.slots.findFirst({ where: eq(slots.id, result.toSlotId) }),
  ]);

  if (client && trainer && fromSlotRow && toSlot) {
    await sendWhatsAppSessionChangedToTrainer({
      trainerId: booking.trainerId,
      clientId: client.id,
      clientName: client.name,
      trainerEmail: trainer.email,
      fromSlotStartAt: fromSlotRow.startAt,
      fromSlotEndAt: fromSlotRow.endAt,
      toSlotStartAt: toSlot.startAt,
      toSlotEndAt: toSlot.endAt,
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

  const { timezone } = await getTrainerSettings(booking.trainerId);
  if (isWallClockPast(slot.startAt, timezone)) {
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

  const { clientBookingWindowWeeks, timezone } = await getTrainerSettings(trainerId);
  if (isWallClockPast(fromSlot.startAt, timezone)) {
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

  if (!isWithinClientBookingWindow(targetSlot.startAt, clientBookingWindowWeeks, timezone)) {
    throw new Error("Selected slot is outside the client booking window");
  }

  await abortChangeByBookingToken(booking.token);

  const fromSlotId = booking.slotId;

  await db.transaction(async (tx) => {
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
        status: "booked",
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
  });

  const detail = await getBookingDetailForTrainer(trainerId, bookingId);
  if (!detail) throw new Error("Booking not found");
  return detail;
}
