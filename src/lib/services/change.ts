import { nanoid } from "nanoid";
import { eq, and, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, changeRequests, slots } from "@/lib/db/schema";
import {
  CHANGE_TIMEOUT_MINUTES,
  addMinutes,
  isInactiveBookingStatus,
  isWithinBookingDeadline,
  nowIso,
} from "@/lib/constants";
import { assertSlotNotHeldByActiveBookingSync } from "./bookings";
import { getAvailableSlotsForChange } from "./templates";
import { getTrainerSettings } from "./settings";
import { assertClientCanUseSlotLocation } from "./locations";

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

  const toSlot = await db.query.slots.findFirst({
    where: eq(slots.id, toSlotId),
  });
  if (!toSlot) throw new Error("Selected slot is no longer available");

  await assertClientCanUseSlotLocation(booking.clientId, toSlot.locationId);

  return db.transaction((tx) => {
    const reqRow = tx
      .select()
      .from(changeRequests)
      .where(eq(changeRequests.id, changeRequestId))
      .get();
    if (!reqRow || reqRow.status !== "browsing") {
      throw new Error("Change request is no longer active");
    }

    const toSlotRow = tx
      .select()
      .from(slots)
      .where(eq(slots.id, toSlotId))
      .get();
    if (!toSlotRow || toSlotRow.status !== "available") {
      throw new Error("Selected slot is no longer available");
    }

    const bookingRow = tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, reqRow.bookingId))
      .get();
    if (!bookingRow) throw new Error("Booking not found");

    assertSlotNotHeldByActiveBookingSync(tx, toSlotId, bookingRow.id);

    const ts = nowIso();
    const fromSlotId = reqRow.fromSlotId;

    tx.update(bookings)
      .set({
        slotId: toSlotId,
        sessionStartAt: toSlotRow.startAt,
        status: "confirmed",
        updatedAt: ts,
      })
      .where(eq(bookings.id, bookingRow.id))
      .run();

    const claim = tx
      .update(slots)
      .set({ status: "booked" })
      .where(and(eq(slots.id, toSlotId), eq(slots.status, "available")))
      .run();
    if (claim.changes === 0) {
      throw new Error("Selected slot is no longer available");
    }

    tx.update(slots)
      .set({ status: "available" })
      .where(eq(slots.id, fromSlotId))
      .run();

    tx.update(changeRequests)
      .set({
        toSlotId,
        status: "confirmed",
        updatedAt: ts,
      })
      .where(eq(changeRequests.id, changeRequestId))
      .run();

    return { bookingId: bookingRow.id, fromSlotId, toSlotId };
  });
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
