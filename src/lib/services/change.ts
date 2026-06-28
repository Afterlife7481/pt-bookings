import { nanoid } from "nanoid";
import { eq, and, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, changeRequests, slots } from "@/lib/db/schema";
import {
  CHANGE_TIMEOUT_MINUTES,
  addMinutes,
  isWithinBookingDeadline,
  nowIso,
} from "@/lib/constants";
import { assertSlotNotHeldByActiveBooking } from "./bookings";
import { getAvailableSlotsForChange } from "./templates";
import { getTrainerSettings } from "./settings";

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

export async function startChangeRequest(bookingToken: string) {
  await expireStaleChangeRequests();
  const db = getDb();

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, bookingToken),
  });
  if (!booking || booking.status === "canceled") {
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
    isWithinBookingDeadline(
      slot.startAt,
      booking.override36h,
      cancelDeadlineHours,
    ) &&
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

  const existing = await db.query.changeRequests.findFirst({
    where: and(
      eq(changeRequests.bookingId, booking.id),
      eq(changeRequests.status, "browsing"),
    ),
  });

  if (existing) {
    return {
      changeRequestId: existing.id,
      availableSlots: await getAvailableSlotsForChange(
        booking.trainerId,
        booking.slotId,
        slot.startAt,
      ),
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

  const availableSlots = await getAvailableSlotsForChange(
    booking.trainerId,
    booking.slotId,
    slot.startAt,
  );

  return { changeRequestId, availableSlots };
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

  const toSlot = await db.query.slots.findFirst({
    where: eq(slots.id, toSlotId),
  });
  if (!toSlot || toSlot.status !== "available") {
    throw new Error("Selected slot is no longer available");
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, req.bookingId),
  });
  if (!booking) throw new Error("Booking not found");

  await assertSlotNotHeldByActiveBooking(db, toSlotId, booking.id);

  const ts = nowIso();
  const fromSlotId = req.fromSlotId;

  await db
    .update(bookings)
    .set({
      slotId: toSlotId,
      sessionStartAt: toSlot.startAt,
      status: "confirmed",
      updatedAt: ts,
    })
    .where(eq(bookings.id, booking.id));

  await db
    .update(slots)
    .set({ status: "booked" })
    .where(eq(slots.id, toSlotId));

  await db
    .update(slots)
    .set({ status: "available" })
    .where(eq(slots.id, fromSlotId));

  await db
    .update(changeRequests)
    .set({
      toSlotId,
      status: "confirmed",
      updatedAt: ts,
    })
    .where(eq(changeRequests.id, changeRequestId));

  return { bookingId: booking.id, fromSlotId, toSlotId };
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
