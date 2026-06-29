import { nanoid } from "nanoid";
import { eq, and, gte, lt, lte, ne, asc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  appliedWeeks,
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
  assertValidScheduleSlotTimes,
  clientBookingWindowDays,
  defaultSlotEndTime,
  formatDate,
  nowIso,
  parseTimeOnDate,
  parseDateOnly,
  parseTimeToMinutes,
  slotDayOfWeek,
  slotTimeLabel,
  startOfWeekMonday,
  timeRangesOverlap,
  toLocalDateTimeString,
  parseLocalDateTime,
} from "@/lib/constants";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import { createBookingForSlot } from "./bookings";
import { getOrCreateAppliedWeek } from "./schedule";
import { assertTrainerLocation, getEnabledClientLocationIds } from "./locations";
import { getTrainerSettings } from "./settings";

const WEEKLY_TEMPLATE_NAME = "Weekly template";

export type ApplyTemplateResult = {
  appliedWeekId: string;
  weekStart: string;
  slotsCreated: number;
  recurringBooked: number;
  conflicts: string[];
};

export type TrainerTemplate = {
  id: string;
  trainerId: string;
  name: string;
  createdAt: string;
  slots: {
    id: string;
    templateId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    locationId: string | null;
    locationName: string | null;
  }[];
};

export type TemplateSlotOverlay = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
};

export type TemplateSlotInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
};

function validateTemplateSlots(slotDefs: TemplateSlotInput[]) {
  const byDay = new Map<number, TemplateSlotInput[]>();

  for (const slot of slotDefs) {
    assertValidScheduleSlotTimes(slot.startTime, slot.endTime);
    const daySlots = byDay.get(slot.dayOfWeek) ?? [];
    daySlots.push(slot);
    byDay.set(slot.dayOfWeek, daySlots);
  }

  for (const [dayOfWeek, daySlots] of byDay) {
    const sorted = [...daySlots].sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (
        timeRangesOverlap(
          current.startTime,
          current.endTime,
          next.startTime,
          next.endTime,
        )
      ) {
        throw new Error(
          `Template slots overlap on ${dayOfWeekLabel(dayOfWeek)} (${current.startTime}–${current.endTime} and ${next.startTime}–${next.endTime}). Your template was not saved.`,
        );
      }
    }
  }
}

async function loadTemplateWithSlots(
  templateId: string,
): Promise<TrainerTemplate | null> {
  const db = getDb();
  const template = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.id, templateId),
  });
  if (!template) return null;

  const tSlots = await db
    .select({
      slot: templateSlots,
      location: locations,
    })
    .from(templateSlots)
    .leftJoin(locations, eq(templateSlots.locationId, locations.id))
    .where(eq(templateSlots.templateId, templateId));

  return {
    ...template,
    slots: tSlots.map(({ slot, location }) => ({
      ...slot,
      locationName: location?.name ?? null,
    })),
  };
}

export async function getTrainerTemplate(
  trainerId: string,
): Promise<TrainerTemplate | null> {
  const db = getDb();
  const template = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.trainerId, trainerId),
  });
  if (!template) return null;
  return loadTemplateWithSlots(template.id);
}

/** @deprecated use getTrainerTemplate */
export const getDefaultTemplate = getTrainerTemplate;

export async function getTrainerTemplateOverlay(
  trainerId: string,
): Promise<TemplateSlotOverlay[]> {
  const template = await getTrainerTemplate(trainerId);
  if (!template) return [];

  return template.slots
    .filter((slot): slot is typeof slot & { locationId: string } =>
      Boolean(slot.locationId),
    )
    .map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      locationId: slot.locationId,
      locationName: slot.locationName ?? "Unknown location",
    }));
}

/** @deprecated use getTrainerTemplateOverlay */
export const getDefaultTemplateOverlay = getTrainerTemplateOverlay;

async function prepareTemplateSlotDefs(
  trainerId: string,
  slotDefs: TemplateSlotInput[],
): Promise<TemplateSlotInput[]> {
  const unique = new Map<string, TemplateSlotInput>();
  for (const slot of slotDefs) {
    await assertTrainerLocation(trainerId, slot.locationId);
    unique.set(`${slot.dayOfWeek}-${slot.startTime}`, slot);
  }

  const normalized = [...unique.values()];
  if (normalized.length === 0) {
    throw new Error("Add at least one slot to the template");
  }

  validateTemplateSlots(normalized);
  return normalized;
}

type TemplateDbTx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

function insertTemplateSlotsTx(
  tx: TemplateDbTx,
  templateId: string,
  normalized: TemplateSlotInput[],
) {
  for (const s of normalized) {
    tx.insert(templateSlots)
      .values({
        id: nanoid(),
        templateId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        locationId: s.locationId,
      })
      .run();
  }
}

export async function saveTrainerTemplate(
  trainerId: string,
  slotDefs: TemplateSlotInput[],
) {
  const db = getDb();
  const normalized = await prepareTemplateSlotDefs(trainerId, slotDefs);

  const existing = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.trainerId, trainerId),
  });

  if (existing) {
    db.transaction((tx) => {
      tx.delete(templateSlots)
        .where(eq(templateSlots.templateId, existing.id))
        .run();
      insertTemplateSlotsTx(tx, existing.id, normalized);
    });
    return existing.id;
  }

  const id = nanoid();
  db.transaction((tx) => {
    tx.insert(weeklyTemplates)
      .values({
        id,
        trainerId,
        name: WEEKLY_TEMPLATE_NAME,
        createdAt: nowIso(),
      })
      .run();
    insertTemplateSlotsTx(tx, id, normalized);
  });
  return id;
}

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

  const tSlots = await db
    .select()
    .from(templateSlots)
    .where(eq(templateSlots.templateId, templateId));

  const prefs = await db
    .select()
    .from(recurringPreferences)
    .where(eq(recurringPreferences.trainerId, template.trainerId));

  const result: ApplyTemplateResult = {
    appliedWeekId: "",
    weekStart,
    slotsCreated: 0,
    recurringBooked: 0,
    conflicts: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appliedWeek = await getOrCreateAppliedWeek(template.trainerId, weekStart);
  result.appliedWeekId = appliedWeek.id;

  const createdSlotIds: string[] = [];

  for (const ts of tSlots) {
    const slotDate = addDays(
      weekDate,
      (ts.dayOfWeek - weekDate.getDay() + 7) % 7,
    );
    const startAt = parseTimeOnDate(formatDate(slotDate), ts.startTime);
    if (startAt < today) continue;

    const startAtStr = toLocalDateTimeString(startAt);
    const endAtStr = toLocalDateTimeString(
      parseTimeOnDate(formatDate(slotDate), ts.endTime),
    );
    const existingSlot = await db.query.slots.findFirst({
      where: and(
        eq(slots.trainerId, template.trainerId),
        eq(slots.startAt, startAtStr),
      ),
    });
    if (existingSlot) continue;

    const matchingPref = prefs.find(
      (p) => p.dayOfWeek === ts.dayOfWeek && p.startTime === ts.startTime,
    );
    const locationId = matchingPref?.locationId ?? ts.locationId;

    const slotId = nanoid();
    try {
      await db.insert(slots).values({
        id: slotId,
        trainerId: template.trainerId,
        appliedWeekId: appliedWeek.id,
        startAt: startAtStr,
        endAt: endAtStr,
        status: "available",
        locationId,
        createdAt: nowIso(),
      });
      createdSlotIds.push(slotId);
      result.slotsCreated++;
    } catch {
      continue;
    }
  }

  for (const pref of prefs) {
    for (const slotId of createdSlotIds) {
      const slot = await db.query.slots.findFirst({
        where: and(eq(slots.id, slotId), eq(slots.status, "available")),
      });
      if (!slot) continue;

      if (
        slotDayOfWeek(slot.startAt) !== pref.dayOfWeek ||
        slotTimeLabel(slot.startAt) !== pref.startTime
      ) {
        continue;
      }

      await createBookingForSlot({
        slotId: slot.id,
        clientId: pref.clientId,
        trainerId: pref.trainerId,
        isRecurring: true,
        sendConfirmation: false,
      });
      result.recurringBooked++;
      break;
    }
  }

  return result;
}

export async function applyTrainerTemplateToWeek(
  trainerId: string,
  weekStart: string,
): Promise<ApplyTemplateResult> {
  const template = await getTrainerTemplate(trainerId);
  if (!template) {
    throw new Error("Create a weekly template before applying to the schedule");
  }
  return applyTemplateToWeek(template.id, weekStart, trainerId);
}

/** @deprecated use applyTemplateToWeek */
export async function applyTemplateToWeeks(
  templateId: string,
  weekStarts: string[],
): Promise<ApplyTemplateResult & { appliedWeekIds: string[] }> {
  const appliedWeekIds: string[] = [];
  let last: ApplyTemplateResult | null = null;
  for (const weekStart of weekStarts) {
    last = await applyTemplateToWeek(templateId, weekStart);
    appliedWeekIds.push(last.appliedWeekId);
  }
  return { ...last!, appliedWeekIds };
}

export function getUpcomingWeekStarts(count = 3): string[] {
  const monday = startOfWeekMonday(new Date());
  return Array.from({ length: count }, (_, i) =>
    formatDate(addDays(monday, i * 7)),
  );
}

export type AvailableSlotOption = {
  id: string;
  startAt: string;
  locationName: string | null;
  locationAddress: string | null;
};

export async function getAvailableSlotsForChange(
  trainerId: string,
  excludeSlotId?: string,
  originalSlotStartAt?: string,
  clientId?: string,
): Promise<AvailableSlotOption[]> {
  const db = getDb();
  const now = nowIso();
  const { clientBookingWindowWeeks } = await getTrainerSettings(trainerId);
  const max = toLocalDateTimeString(
    addDays(new Date(), clientBookingWindowDays(clientBookingWindowWeeks)),
  );

  let allowedLocationIds: string[] | null = null;
  if (clientId) {
    allowedLocationIds = await getEnabledClientLocationIds(clientId);
    if (allowedLocationIds.length === 0) {
      return [];
    }
  }

  const available = await db
    .select({
      slot: slots,
      location: locations,
    })
    .from(slots)
    .leftJoin(locations, eq(slots.locationId, locations.id))
    .where(
      and(
        eq(slots.trainerId, trainerId),
        eq(slots.status, "available"),
        gte(slots.startAt, now),
        lte(slots.startAt, max),
        excludeSlotId ? ne(slots.id, excludeSlotId) : undefined,
        allowedLocationIds
          ? inArray(slots.locationId, allowedLocationIds)
          : undefined,
      ),
    )
    .orderBy(asc(slots.startAt));

  const mapped: AvailableSlotOption[] = available.map(({ slot, location }) => ({
    id: slot.id,
    startAt: slot.startAt,
    locationName: location?.name ?? null,
    locationAddress: location?.address ?? null,
  }));

  if (!originalSlotStartAt) return mapped;

  const originalDay = slotDayOfWeek(originalSlotStartAt);
  return [...mapped].sort((a, b) => {
    const aSame = slotDayOfWeek(a.startAt) === originalDay ? 0 : 1;
    const bSame = slotDayOfWeek(b.startAt) === originalDay ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    return parseLocalDateTime(a.startAt).getTime() - parseLocalDateTime(b.startAt).getTime();
  });
}

const SESSION_LIST_LIMIT = 100;

export async function listBookings(trainerId: string) {
  const db = getDb();
  const now = Date.now();

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
    if (parseLocalDateTime(row.slot.startAt).getTime() >= now) {
      upcoming.push(row);
    } else {
      past.push(row);
    }
  }

  past.reverse();

  return [...upcoming, ...past].slice(0, SESSION_LIST_LIMIT);
}

export async function listAppliedWeeks(trainerId: string) {
  const db = getDb();
  return db
    .select()
    .from(appliedWeeks)
    .where(eq(appliedWeeks.trainerId, trainerId));
}
