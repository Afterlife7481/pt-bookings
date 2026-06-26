import { nanoid } from "nanoid";
import { eq, and, gte, lte, ne, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  appliedWeeks,
  bookings,
  clients,
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

export type ApplyTemplateResult = {
  appliedWeekId: string;
  weekStart: string;
  slotsCreated: number;
  recurringBooked: number;
  conflicts: string[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function applyTemplateToWeek(
  templateId: string,
  weekStart: string,
): Promise<ApplyTemplateResult> {
  const db = getDb();

  const template = await db.query.weeklyTemplates.findFirst({
    where: eq(weeklyTemplates.id, templateId),
  });
  if (!template) throw new Error("Template not found");

  const weekDate = parseDateOnly(weekStart);
  if (weekDate.getDay() !== 1) {
    throw new Error("weekStart must be a Monday (YYYY-MM-DD)");
  }

  const existing = await db.query.appliedWeeks.findFirst({
    where: and(
      eq(appliedWeeks.trainerId, template.trainerId),
      eq(appliedWeeks.weekStart, weekStart),
    ),
  });

  if (existing) {
    throw new Error(`A template is already applied for week starting ${weekStart}.`);
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

  const appliedWeekId = nanoid();
  await db.insert(appliedWeeks).values({
    id: appliedWeekId,
    trainerId: template.trainerId,
    templateId,
    weekStart,
    createdAt: nowIso(),
  });
  result.appliedWeekId = appliedWeekId;

  const createdSlotIds: string[] = [];

  for (const ts of tSlots) {
    const slotDate = addDays(
      weekDate,
      (ts.dayOfWeek - weekDate.getDay() + 7) % 7,
    );
    const startAt = parseTimeOnDate(formatDate(slotDate), ts.startTime);
    if (startAt < today) continue;

    const slotId = nanoid();
    try {
      await db.insert(slots).values({
        id: slotId,
        trainerId: template.trainerId,
        appliedWeekId,
        startAt: toLocalDateTimeString(startAt),
        status: "available",
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
        .select()
        .from(templateSlots)
        .where(eq(templateSlots.templateId, t.id));
      return { ...t, slots: tSlots };
    }),
  );
}

export async function createTemplate(
  name: string,
  slotDefs: { dayOfWeek: number; startTime: string }[],
  trainerId: string,
) {
  const db = getDb();
  const id = nanoid();
  await db.insert(weeklyTemplates).values({
    id,
    trainerId,
    name,
    createdAt: nowIso(),
  });

  for (const s of slotDefs) {
    await db.insert(templateSlots).values({
      id: nanoid(),
      templateId: id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
    });
  }

  return id;
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
