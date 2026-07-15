import { nanoid } from "nanoid";
import { eq, and, gte, lt, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  bookings,
  clients,
  locations,
  recurringPreferences,
  slots,
  templateSlots,
  weeklyTemplates,
} from "@/lib/db/schema";
import {
  addDays,
  formatDate,
  nowIso,
  parseTimeOnDate,
  parseDateOnly,
  toLocalDateTimeString,
  parseLocalDateTime,
} from "@/lib/constants";
import { recurringSlotKey } from "@/lib/schedule-grid";
import { createBookingForSlot } from "./bookings";
import { getOrCreateAppliedWeek } from "./schedule";
import { listHolidaysOverlappingRange } from "./holidays";
import {
  HOLIDAY_TEMPLATE_CONFLICT_RECOMMENDATIONS,
  holidayDisplayName,
  parseHolidayRangesForLookup,
  findOverlappingHolidayParsedRecord,
  datetimeRangesOverlap,
} from "@/lib/holidays-utils";
import {
  createTemplateConflictAlerts,
  type TemplateConflictInput,
} from "@/lib/services/template-conflicts";

export type ApplyTemplateResult = {
  appliedWeekId: string;
  weekStart: string;
  slotsCreated: number;
  recurringBooked: number;
  conflicts: string[];
  recommendations: string[];
};

export async function applyTemplateToWeek(
  templateId: string,
  weekStart: string,
  trainerId?: string,
): Promise<ApplyTemplateResult> {
  const db = getDb();

  const template = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.id, templateId),
  });
  if (!template) throw new Error("Template not found");
  if (trainerId && template.trainerId !== trainerId) {
    throw new Error("Template not found");
  }

  const weekDate = parseDateOnly(weekStart);
  if (weekDate.getDay() !== 1) {
    throw new Error("weekStart must be a Monday (YYYY-MM-DD)");
  }

  const weekEnd = addDays(weekDate, 7);
  const startAtMin = `${formatDate(weekDate)}T00:00:00`;
  const startAtMax = `${formatDate(weekEnd)}T00:00:00`;

  const bookedInWeek = await db
    .select({ slotId: slots.id })
    .from(slots)
    .innerJoin(bookings, eq(bookings.slotId, slots.id))
    .where(
      and(
        eq(slots.trainerId, template.trainerId),
        gte(slots.startAt, startAtMin),
        lt(slots.startAt, startAtMax),
        ne(bookings.status, "canceled"),
      ),
    )
    .limit(1);

  if (bookedInWeek.length > 0) {
    throw new Error(
      "Cannot apply a template while client sessions are booked this week.",
    );
  }

  const [tSlots, prefs, holidays, appliedWeek, existingWeekSlots, trainerLocations] =
    await Promise.all([
      db
        .select()
        .from(templateSlots)
        .where(eq(templateSlots.templateId, templateId)),
      db
        .select({
          pref: recurringPreferences,
          clientName: clients.name,
          prefLocationName: locations.name,
        })
        .from(recurringPreferences)
        .innerJoin(clients, eq(recurringPreferences.clientId, clients.id))
        .leftJoin(locations, eq(recurringPreferences.locationId, locations.id))
        .where(eq(recurringPreferences.trainerId, template.trainerId)),
      listHolidaysOverlappingRange(
        template.trainerId,
        startAtMin,
        startAtMax,
      ),
      getOrCreateAppliedWeek(template.trainerId, weekStart),
      db
        .select({ startAt: slots.startAt, endAt: slots.endAt })
        .from(slots)
        .where(
          and(
            eq(slots.trainerId, template.trainerId),
            gte(slots.startAt, startAtMin),
            lt(slots.startAt, startAtMax),
          ),
        ),
      db
        .select({ id: locations.id, name: locations.name })
        .from(locations)
        .where(eq(locations.trainerId, template.trainerId)),
    ]);

  const locationNameById = new Map(
    trainerLocations.map((row) => [row.id, row.name]),
  );

  const result: ApplyTemplateResult = {
    appliedWeekId: appliedWeek.id,
    weekStart,
    slotsCreated: 0,
    recurringBooked: 0,
    conflicts: [],
    recommendations: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingStartAt = new Set(existingWeekSlots.map((row) => row.startAt));

  const prefBySlotKey = new Map(
    prefs.map((row) => [
      recurringSlotKey(row.pref.dayOfWeek, row.pref.startTime),
      row,
    ]),
  );
  const parsedHolidays = parseHolidayRangesForLookup(holidays);

  type SlotInsert = {
    id: string;
    trainerId: string;
    appliedWeekId: string;
    startAt: string;
    endAt: string;
    status: "available";
    locationId: string | null;
    createdAt: string;
  };

  const slotsToInsert: SlotInsert[] = [];
  const createdSlotByKey = new Map<string, string>();
  const conflictRecords: TemplateConflictInput[] = [];

  for (const ts of tSlots) {
    const slotDate = addDays(
      weekDate,
      (ts.dayOfWeek - weekDate.getDay() + 7) % 7,
    );
    const startAt = parseTimeOnDate(formatDate(slotDate), ts.startTime);
    if (startAt < today) continue;

    const startAtStr = toLocalDateTimeString(startAt);
    if (existingStartAt.has(startAtStr)) continue;

    const endAtStr = toLocalDateTimeString(
      parseTimeOnDate(formatDate(slotDate), ts.endTime),
    );

    const overlapsExisting = existingWeekSlots.some((row) =>
      datetimeRangesOverlap(startAtStr, endAtStr, row.startAt, row.endAt),
    );
    const overlapsQueued = slotsToInsert.some((row) =>
      datetimeRangesOverlap(startAtStr, endAtStr, row.startAt, row.endAt),
    );
    if (overlapsExisting || overlapsQueued) continue;

    const holiday = findOverlappingHolidayParsedRecord(
      parseLocalDateTime(startAtStr).getTime(),
      parseLocalDateTime(endAtStr).getTime(),
      parsedHolidays,
    );
    const slotKey = recurringSlotKey(ts.dayOfWeek, ts.startTime);
    const matchingPref = prefBySlotKey.get(slotKey);
    if (holiday) {
      if (matchingPref) {
        const dayLabel = slotDate.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        result.conflicts.push(
          `Could not book recurring session for ${matchingPref.clientName}: ${dayLabel} ${ts.startTime}–${ts.endTime} (${holidayDisplayName(holiday)})`,
        );
        const locationId = matchingPref.pref.locationId ?? ts.locationId;
        const locationName =
          matchingPref.prefLocationName ??
          (locationId ? locationNameById.get(locationId) ?? null : null);
        conflictRecords.push({
          trainerId: template.trainerId,
          clientId: matchingPref.pref.clientId,
          clientName: matchingPref.clientName,
          weekStart,
          dayOfWeek: ts.dayOfWeek,
          startTime: ts.startTime,
          endTime: ts.endTime,
          locationId,
          locationName,
          holidayId: holiday.id ?? null,
          holidayLabel: holidayDisplayName(holiday),
        });
      }
      continue;
    }

    const locationId = matchingPref?.pref.locationId ?? ts.locationId;
    const slotId = nanoid();

    slotsToInsert.push({
      id: slotId,
      trainerId: template.trainerId,
      appliedWeekId: appliedWeek.id,
      startAt: startAtStr,
      endAt: endAtStr,
      status: "available",
      locationId,
      createdAt: nowIso(),
    });
    createdSlotByKey.set(slotKey, slotId);
  }

  if (slotsToInsert.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of slotsToInsert) {
        await tx.insert(slots).values(row);
      }
    });
    result.slotsCreated = slotsToInsert.length;
  }

  for (const pref of prefs) {
    const slotId = createdSlotByKey.get(
      `${pref.pref.dayOfWeek}-${pref.pref.startTime}`,
    );
    if (!slotId) continue;

    await createBookingForSlot({
      slotId,
      clientId: pref.pref.clientId,
      trainerId: pref.pref.trainerId,
      isRecurring: true,
      sendConfirmation: false,
      locationValidation: "trainer",
    });
    result.recurringBooked++;
  }

  if (result.conflicts.length > 0) {
    result.recommendations = [...HOLIDAY_TEMPLATE_CONFLICT_RECOMMENDATIONS];
    await createTemplateConflictAlerts(conflictRecords);
  }

  return result;
}

export async function applyTrainerTemplateToWeek(
  trainerId: string,
  weekStart: string,
): Promise<ApplyTemplateResult> {
  const db = getDb();
  const template = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.trainerId, trainerId),
  });
  if (!template) {
    throw new Error("Create a weekly template before applying to the schedule");
  }
  return applyTemplateToWeek(template.id, weekStart, trainerId);
}
