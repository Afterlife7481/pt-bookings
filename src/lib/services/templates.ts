import { nanoid } from "nanoid";
import { eq, and, gte, lt, lte, ne, asc } from "drizzle-orm";
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
  BOOKING_WINDOW_DAYS,
  addDays,
  formatDate,
  nowIso,
  parseTimeOnDate,
  parseDateOnly,
  slotDayOfWeek,
  slotTimeLabel,
  startOfWeekMonday,
  toLocalDateTimeString,
  parseLocalDateTime,
} from "@/lib/constants";
import { createBookingForSlot } from "./bookings";
import { getOrCreateAppliedWeek } from "./schedule";
import { assertTrainerLocation } from "./locations";

export type ApplyTemplateResult = {
  appliedWeekId: string;
  weekStart: string;
  slotsCreated: number;
  recurringBooked: number;
  conflicts: string[];
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
    const existingSlot = await db.query.slots.findFirst({
      where: and(
        eq(slots.trainerId, template.trainerId),
        eq(slots.startAt, startAtStr),
      ),
    });
    if (existingSlot) continue;

    const slotId = nanoid();
    try {
      await db.insert(slots).values({
        id: slotId,
        trainerId: template.trainerId,
        appliedWeekId: appliedWeek.id,
        startAt: startAtStr,
        status: "available",
        locationId: ts.locationId,
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

export async function listTemplates(trainerId: string) {
  const db = getDb();
  const templates = await db
    .select()
    .from(weeklyTemplates)
    .where(eq(weeklyTemplates.trainerId, trainerId));

  return Promise.all(
    templates.map(async (t) => {
      const tSlots = await db
        .select({
          slot: templateSlots,
          location: locations,
        })
        .from(templateSlots)
        .leftJoin(locations, eq(templateSlots.locationId, locations.id))
        .where(eq(templateSlots.templateId, t.id));
      return {
        ...t,
        slots: tSlots.map(({ slot, location }) => ({
          ...slot,
          locationName: location?.name ?? null,
        })),
      };
    }),
  );
}

export type TemplateSlotInput = {
  dayOfWeek: number;
  startTime: string;
  locationId: string;
};

async function insertTemplateSlots(
  trainerId: string,
  templateId: string,
  slotDefs: TemplateSlotInput[],
) {
  const db = getDb();
  const unique = new Map<string, TemplateSlotInput>();
  for (const slot of slotDefs) {
    await assertTrainerLocation(trainerId, slot.locationId);
    unique.set(`${slot.dayOfWeek}-${slot.startTime}`, slot);
  }

  const normalized = [...unique.values()];
  if (normalized.length === 0) {
    throw new Error("Add at least one slot to the template");
  }

  for (const s of normalized) {
    await db.insert(templateSlots).values({
      id: nanoid(),
      templateId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      locationId: s.locationId,
    });
  }

  return normalized.length;
}

export async function getTemplateForTrainer(
  trainerId: string,
  templateId: string,
) {
  const templates = await listTemplates(trainerId);
  return templates.find((t) => t.id === templateId) ?? null;
}

export async function createTemplate(
  name: string,
  slotDefs: TemplateSlotInput[],
  trainerId: string,
) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Template name is required");

  const db = getDb();
  const id = nanoid();
  await db.insert(weeklyTemplates).values({
    id,
    trainerId,
    name: trimmed,
    createdAt: nowIso(),
  });

  await insertTemplateSlots(trainerId, id, slotDefs);
  return id;
}

export async function updateTemplate(
  trainerId: string,
  templateId: string,
  data: { name: string; slots: TemplateSlotInput[] },
) {
  const db = getDb();
  const template = await db.query.weeklyTemplates.findFirst({
    where: and(
      eq(weeklyTemplates.id, templateId),
      eq(weeklyTemplates.trainerId, trainerId),
    ),
  });
  if (!template) throw new Error("Template not found");

  const trimmed = data.name.trim();
  if (!trimmed) throw new Error("Template name is required");

  await db
    .update(weeklyTemplates)
    .set({ name: trimmed })
    .where(eq(weeklyTemplates.id, templateId));

  await db
    .delete(templateSlots)
    .where(eq(templateSlots.templateId, templateId));

  await insertTemplateSlots(trainerId, templateId, data.slots);
}

export async function getAvailableSlotsForChange(
  trainerId: string,
  excludeSlotId?: string,
  originalSlotStartAt?: string,
) {
  const db = getDb();
  const now = nowIso();
  const max = toLocalDateTimeString(addDays(new Date(), BOOKING_WINDOW_DAYS));

  const available = await db
    .select()
    .from(slots)
    .where(
      and(
        eq(slots.trainerId, trainerId),
        eq(slots.status, "available"),
        gte(slots.startAt, now),
        lte(slots.startAt, max),
        excludeSlotId ? ne(slots.id, excludeSlotId) : undefined,
      ),
    )
    .orderBy(asc(slots.startAt));

  if (!originalSlotStartAt) return available;

  const originalDay = slotDayOfWeek(originalSlotStartAt);
  return [...available].sort((a, b) => {
    const aSame = slotDayOfWeek(a.startAt) === originalDay ? 0 : 1;
    const bSame = slotDayOfWeek(b.startAt) === originalDay ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    return parseLocalDateTime(a.startAt).getTime() - parseLocalDateTime(b.startAt).getTime();
  });
}

export async function listBookings(trainerId: string) {
  const db = getDb();
  return db
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
}

export async function listAppliedWeeks(trainerId: string) {
  const db = getDb();
  return db
    .select()
    .from(appliedWeeks)
    .where(eq(appliedWeeks.trainerId, trainerId));
}
