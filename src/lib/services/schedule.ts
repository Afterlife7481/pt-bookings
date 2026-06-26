import { eq, and, gte, lt, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import {
  appliedWeeks,
  bookings,
  clients,
  recurringPreferences,
  slots,
  weeklyTemplates,
} from "@/lib/db/schema";
import {
  addDays,
  formatDate,
  nowIso,
  parseDateOnly,
  parseTimeOnDate,
  slotDayOfWeek,
  slotTimeLabel,
  toLocalDateTimeString,
} from "@/lib/constants";
import { createBookingForSlot } from "./bookings";

export type ScheduleEntry = {
  slotId: string;
  startAt: string;
  status: "available" | "booked" | "pending_change";
  booking: {
    id: string;
    token: string;
    status: string;
    isRecurring: boolean;
    clientName: string;
  } | null;
};

export async function getAppliedWeekForSchedule(
  trainerId: string,
  weekStart: string,
) {
  const db = getDb();
  const row = await db.query.appliedWeeks.findFirst({
    where: and(
      eq(appliedWeeks.trainerId, trainerId),
      eq(appliedWeeks.weekStart, weekStart),
    ),
  });
  if (!row) return null;

  const template = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.id, row.templateId),
  });

  return {
    weekStart: row.weekStart,
    templateId: row.templateId,
    templateName: template?.name ?? "Unknown template",
  };
}

export async function getWeekSchedule(
  trainerId: string,
  weekStart: string,
): Promise<{
  weekStart: string;
  weekEnd: string;
  entries: ScheduleEntry[];
  appliedWeek: {
    weekStart: string;
    templateId: string;
    templateName: string;
  } | null;
}> {
  const db = getDb();
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 7);

  const startAtMin = `${formatDate(start)}T00:00:00`;
  const startAtMax = `${formatDate(end)}T00:00:00`;

  const rows = await db
    .select({
      slot: slots,
      booking: bookings,
      client: clients,
    })
    .from(slots)
    .leftJoin(bookings, eq(bookings.slotId, slots.id))
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .where(
      and(
        eq(slots.trainerId, trainerId),
        gte(slots.startAt, startAtMin),
        lt(slots.startAt, startAtMax),
      ),
    )
    .orderBy(asc(slots.startAt));

  const entries: ScheduleEntry[] = rows
    .filter((row) => !row.booking || row.booking.status !== "canceled")
    .map((row) => ({
      slotId: row.slot.id,
      startAt: row.slot.startAt,
      status: row.slot.status,
      booking:
        row.booking && row.client && row.booking.status !== "canceled"
          ? {
              id: row.booking.id,
              token: row.booking.token,
              status: row.booking.status,
              isRecurring: row.booking.isRecurring,
              clientName: row.client.name,
            }
          : null,
    }));

  const appliedWeek = await getAppliedWeekForSchedule(trainerId, weekStart);

  return {
    weekStart: formatDate(start),
    weekEnd: formatDate(addDays(start, 6)),
    entries,
    appliedWeek,
  };
}

export async function addScheduleSlot(
  trainerId: string,
  weekStart: string,
  dayOfWeek: number,
  startTime: string,
): Promise<{ slotId: string; recurringBooked: boolean }> {
  const db = getDb();

  const applied = await db.query.appliedWeeks.findFirst({
    where: and(
      eq(appliedWeeks.trainerId, trainerId),
      eq(appliedWeeks.weekStart, weekStart),
    ),
  });
  if (!applied) {
    throw new Error("Apply a template to this week before adding slots.");
  }

  const weekDate = parseDateOnly(weekStart);
  if (weekDate.getDay() !== 1) {
    throw new Error("weekStart must be a Monday (YYYY-MM-DD)");
  }

  const slotDate = addDays(
    weekDate,
    (dayOfWeek - weekDate.getDay() + 7) % 7,
  );
  const startAt = parseTimeOnDate(formatDate(slotDate), startTime);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startAt < today) {
    throw new Error("Cannot add slots in the past.");
  }

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
    status: "available",
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
  if (booking && booking.status !== "canceled") {
    throw new Error("This slot has a booking and cannot be removed.");
  }

  await db.delete(slots).where(eq(slots.id, slotId));
}
