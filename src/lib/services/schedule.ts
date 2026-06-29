import { eq, and, gte, lt, asc, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import {
  appliedWeeks,
  bookings,
  changeRequests,
  clients,
  lastMinuteInterests,
  locations,
  recurringPreferences,
  slots,
} from "@/lib/db/schema";
import {
  addDays,
  assertValidScheduleSlotTimes,
  defaultSlotEndTime,
  formatDate,
  isInactiveBookingStatus,
  nowIso,
  parseDateOnly,
  parseTimeOnDate,
  slotDayOfWeek,
  slotTimeLabel,
  toLocalDateTimeString,
} from "@/lib/constants";
import { createBookingForSlot } from "./bookings";
import { assertTrainerLocation } from "./locations";
import {
  buildEligibleCountIndex,
  clearExpiredSlotHolds,
} from "./last-minute";
import { getTrainerSettings } from "./settings";

export type ScheduleLastMinuteOffer = {
  id: string;
  clientId: string;
  clientName: string;
  status: string;
  expiresAt: string | null;
};

export type ScheduleLastMinuteInfo = {
  eligibleCount: number;
  heldForClientId: string | null;
  heldClientName: string | null;
  holdExpiresAt: string | null;
  offers: ScheduleLastMinuteOffer[];
};

export type ScheduleEntry = {
  slotId: string;
  startAt: string;
  endAt: string;
  status: "available" | "booked" | "pending_change";
  location: { id: string; name: string } | null;
  booking: {
    id: string;
    token: string;
    status: string;
    isRecurring: boolean;
    clientName: string;
  } | null;
  lastMinute: ScheduleLastMinuteInfo | null;
};

async function isWeekScheduleApplied(trainerId: string, weekStart: string) {
  const db = getDb();
  const row = await db.query.appliedWeeks.findFirst({
    where: and(
      eq(appliedWeeks.trainerId, trainerId),
      eq(appliedWeeks.weekStart, weekStart),
    ),
  });
  return !!row;
}

export async function getWeekSchedule(
  trainerId: string,
  weekStart: string,
): Promise<{
  weekStart: string;
  weekEnd: string;
  entries: ScheduleEntry[];
  weekApplied: boolean;
  lockHours: number;
}> {
  await clearExpiredSlotHolds(trainerId);

  const db = getDb();
  const settings = await getTrainerSettings(trainerId);
  const prefIndex = await buildEligibleCountIndex(trainerId);
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 7);

  const startAtMin = `${formatDate(start)}T00:00:00`;
  const startAtMax = `${formatDate(end)}T00:00:00`;

  const rows = await db
    .select({
      slot: slots,
      booking: bookings,
      client: clients,
      location: locations,
    })
    .from(slots)
    .leftJoin(bookings, eq(bookings.slotId, slots.id))
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(locations, eq(slots.locationId, locations.id))
    .where(
      and(
        eq(slots.trainerId, trainerId),
        gte(slots.startAt, startAtMin),
        lt(slots.startAt, startAtMax),
      ),
    )
    .orderBy(asc(slots.startAt));

  const filteredRows = rows.filter(
    (row) => !row.booking || !isInactiveBookingStatus(row.booking.status),
  );

  const openRows = filteredRows.filter(
    (row) =>
      row.slot.status === "available" &&
      (!row.booking || isInactiveBookingStatus(row.booking.status)),
  );
  const openSlotIds = openRows.map((row) => row.slot.id);

  const heldClientIds = [
    ...new Set(
      openRows
        .map((row) => row.slot.heldForClientId)
        .filter((id): id is string => !!id),
    ),
  ];

  const heldClients =
    heldClientIds.length > 0
      ? await db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(inArray(clients.id, heldClientIds))
      : [];
  const heldNameById = new Map(heldClients.map((c) => [c.id, c.name]));

  const offersBySlot = new Map<string, ScheduleLastMinuteOffer[]>();
  if (openSlotIds.length > 0) {
    const offerRows = await db
      .select({
        offer: lastMinuteInterests,
        client: clients,
      })
      .from(lastMinuteInterests)
      .innerJoin(clients, eq(lastMinuteInterests.clientId, clients.id))
      .where(inArray(lastMinuteInterests.slotId, openSlotIds))
      .orderBy(asc(lastMinuteInterests.createdAt));

    for (const { offer, client } of offerRows) {
      const list = offersBySlot.get(offer.slotId) ?? [];
      list.push({
        id: offer.id,
        clientId: client.id,
        clientName: client.name,
        status: offer.status,
        expiresAt: offer.expiresAt,
      });
      offersBySlot.set(offer.slotId, list);
    }
  }

  const entries: ScheduleEntry[] = filteredRows.map((row) => {
    const booking =
      row.booking && row.client && !isInactiveBookingStatus(row.booking.status)
        ? {
            id: row.booking.id,
            token: row.booking.token,
            status: row.booking.status,
            isRecurring: row.booking.isRecurring,
            clientName: row.client.name,
          }
        : null;

    const isOpen = !booking && row.slot.status === "available";

    return {
      slotId: row.slot.id,
      startAt: row.slot.startAt,
      endAt: row.slot.endAt,
      status: row.slot.status,
      location: row.location
        ? { id: row.location.id, name: row.location.name }
        : null,
      booking,
      lastMinute: isOpen
        ? {
            eligibleCount:
              prefIndex.get(
                `${slotDayOfWeek(row.slot.startAt)}-${slotTimeLabel(row.slot.startAt)}`,
              ) ?? 0,
            heldForClientId: row.slot.heldForClientId,
            heldClientName: row.slot.heldForClientId
              ? (heldNameById.get(row.slot.heldForClientId) ?? null)
              : null,
            holdExpiresAt: row.slot.holdExpiresAt,
            offers: offersBySlot.get(row.slot.id) ?? [],
          }
        : null,
    };
  });

  const weekApplied = await isWeekScheduleApplied(trainerId, weekStart);

  return {
    weekStart: formatDate(start),
    weekEnd: formatDate(addDays(start, 6)),
    entries,
    weekApplied,
    lockHours: settings.lastMinuteOfferLockHours,
  };
}

export async function getOrCreateAppliedWeek(trainerId: string, weekStart: string) {
  const db = getDb();
  const existing = await db.query.appliedWeeks.findFirst({
    where: and(
      eq(appliedWeeks.trainerId, trainerId),
      eq(appliedWeeks.weekStart, weekStart),
    ),
  });
  if (existing) return existing;

  const weekDate = parseDateOnly(weekStart);
  if (weekDate.getDay() !== 1) {
    throw new Error("weekStart must be a Monday (YYYY-MM-DD)");
  }

  const id = nanoid();
  const createdAt = nowIso();
  await db.insert(appliedWeeks).values({
    id,
    trainerId,
    weekStart,
    createdAt,
  });

  return { id, trainerId, weekStart, createdAt };
}

export async function addScheduleSlot(
  trainerId: string,
  weekStart: string,
  dayOfWeek: number,
  startTime: string,
  locationId: string,
  endTime?: string,
): Promise<{ slotId: string; recurringBooked: boolean }> {
  const db = getDb();
  await assertTrainerLocation(trainerId, locationId);

  const effectiveEndTime = endTime ?? defaultSlotEndTime(startTime);
  assertValidScheduleSlotTimes(startTime, effectiveEndTime);

  const applied = await getOrCreateAppliedWeek(trainerId, weekStart);

  const weekDate = parseDateOnly(weekStart);
  const slotDate = addDays(
    weekDate,
    (dayOfWeek - weekDate.getDay() + 7) % 7,
  );
  const startAt = parseTimeOnDate(formatDate(slotDate), startTime);
  const endAt = parseTimeOnDate(formatDate(slotDate), effectiveEndTime);

  const existing = await db.query.slots.findFirst({
    where: and(
      eq(slots.trainerId, trainerId),
      eq(slots.startAt, toLocalDateTimeString(startAt)),
    ),
  });
  if (existing) {
    throw new Error("A slot already exists at this time.");
  }

  const slotId = nanoid();
  await db.insert(slots).values({
    id: slotId,
    trainerId,
    appliedWeekId: applied.id,
    startAt: toLocalDateTimeString(startAt),
    endAt: toLocalDateTimeString(endAt),
    status: "available",
    locationId,
    createdAt: nowIso(),
  });

  let recurringBooked = false;
  const prefs = await db
    .select()
    .from(recurringPreferences)
    .where(eq(recurringPreferences.trainerId, trainerId));

  for (const pref of prefs) {
    if (
      slotDayOfWeek(toLocalDateTimeString(startAt)) !== pref.dayOfWeek ||
      slotTimeLabel(toLocalDateTimeString(startAt)) !== pref.startTime
    ) {
      continue;
    }

    await createBookingForSlot({
      slotId,
      clientId: pref.clientId,
      trainerId: pref.trainerId,
      isRecurring: true,
      sendConfirmation: false,
    });
    recurringBooked = true;
    break;
  }

  return { slotId, recurringBooked };
}

export async function updateScheduleSlotLocation(
  trainerId: string,
  slotId: string,
  locationId: string,
): Promise<void> {
  const db = getDb();
  await assertTrainerLocation(trainerId, locationId);

  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.trainerId, trainerId)),
  });
  if (!slot) throw new Error("Slot not found");
  if (slot.status !== "available") {
    throw new Error("Only open slots can change location.");
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.slotId, slotId),
  });
  if (booking && !isInactiveBookingStatus(booking.status)) {
    throw new Error("This slot has a booking and cannot be updated.");
  }

  await db
    .update(slots)
    .set({ locationId })
    .where(eq(slots.id, slotId));
}

export function hasActiveLastMinuteOffer(
  lastMinute: ScheduleLastMinuteInfo | null,
): boolean {
  if (!lastMinute) return false;
  if (lastMinute.heldForClientId) return true;
  return lastMinute.offers.some((offer) => offer.status === "offered");
}

export async function removeScheduleSlot(
  trainerId: string,
  slotId: string,
): Promise<void> {
  const db = getDb();

  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.trainerId, trainerId)),
  });
  if (!slot) throw new Error("Slot not found");

  if (slot.status !== "available") {
    throw new Error(
      "Only open slots can be removed. Cancel the booking first.",
    );
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.slotId, slotId),
  });
  if (booking && !isInactiveBookingStatus(booking.status)) {
    throw new Error("This slot has a booking and cannot be removed.");
  }

  await clearExpiredSlotHolds(trainerId);

  const refreshedSlot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.trainerId, trainerId)),
  });
  if (!refreshedSlot) throw new Error("Slot not found");

  const activeOffer = await db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.slotId, slotId),
      eq(lastMinuteInterests.status, "offered"),
    ),
  });

  if (activeOffer || refreshedSlot.heldForClientId) {
    throw new Error(
      "Cannot remove this slot while a last-minute offer is active. Wait for the offer to expire or for the client to respond.",
    );
  }

  await db
    .delete(lastMinuteInterests)
    .where(eq(lastMinuteInterests.slotId, slotId));
  await db.delete(slots).where(eq(slots.id, slotId));
}

/** Dev-only: wipe all slots (and related bookings) for a week. */
export async function clearWeekScheduleSlotsDev(
  trainerId: string,
  weekStart: string,
): Promise<{ removed: number }> {
  const db = getDb();
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 7);
  const startAtMin = `${formatDate(start)}T00:00:00`;
  const startAtMax = `${formatDate(end)}T00:00:00`;

  const weekSlots = await db
    .select({ id: slots.id })
    .from(slots)
    .where(
      and(
        eq(slots.trainerId, trainerId),
        gte(slots.startAt, startAtMin),
        lt(slots.startAt, startAtMax),
      ),
    );

  const slotIds = weekSlots.map((row) => row.id);
  if (slotIds.length === 0) {
    return { removed: 0 };
  }

  const weekBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.slotId, slotIds));
  const bookingIds = weekBookings.map((row) => row.id);

  db.transaction((tx) => {
    tx.delete(lastMinuteInterests)
      .where(inArray(lastMinuteInterests.slotId, slotIds))
      .run();

    if (bookingIds.length > 0) {
      tx.delete(changeRequests)
        .where(inArray(changeRequests.bookingId, bookingIds))
        .run();
    }

    tx.delete(changeRequests)
      .where(
        or(
          inArray(changeRequests.fromSlotId, slotIds),
          inArray(changeRequests.toSlotId, slotIds),
        ),
      )
      .run();

    tx.delete(bookings).where(inArray(bookings.slotId, slotIds)).run();
    tx.delete(slots).where(inArray(slots.id, slotIds)).run();
  });

  return { removed: slotIds.length };
}
