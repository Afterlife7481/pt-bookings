import { nanoid } from "nanoid";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainerHolidays } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";
import {
  findOverlappingHoliday,
  holidayDisplayName,
  normalizeHolidayDateTime,
  type HolidayPeriod,
} from "@/lib/holidays-utils";

export type { HolidayPeriod };

function assertValidHolidayRange(startAt: string, endAt: string) {
  const start = normalizeHolidayDateTime(startAt);
  const end = normalizeHolidayDateTime(endAt);
  if (end <= start) {
    throw new Error("End must be after start");
  }
  return { startAt: start, endAt: end };
}

export async function listHolidays(trainerId: string) {
  const db = getDb();
  return db
    .select()
    .from(trainerHolidays)
    .where(eq(trainerHolidays.trainerId, trainerId))
    .orderBy(asc(trainerHolidays.startAt));
}

export async function listHolidaysOverlappingRange(
  trainerId: string,
  rangeStart: string,
  rangeEnd: string,
) {
  const db = getDb();
  return db
    .select()
    .from(trainerHolidays)
    .where(
      and(
        eq(trainerHolidays.trainerId, trainerId),
        lt(trainerHolidays.startAt, rangeEnd),
        gt(trainerHolidays.endAt, rangeStart),
      ),
    )
    .orderBy(asc(trainerHolidays.startAt));
}

async function assertTrainerHoliday(trainerId: string, holidayId: string) {
  const db = getDb();
  const holiday = await db.query.trainerHolidays.findFirst({
    where: and(
      eq(trainerHolidays.id, holidayId),
      eq(trainerHolidays.trainerId, trainerId),
    ),
  });
  if (!holiday) throw new Error("Time off entry not found");
  return holiday;
}

export async function createHoliday(
  trainerId: string,
  params: { startAt: string; endAt: string; label?: string | null },
) {
  const { startAt, endAt } = assertValidHolidayRange(params.startAt, params.endAt);
  const label = params.label?.trim() || null;

  const db = getDb();
  const id = nanoid();
  const createdAt = nowIso();

  await db.insert(trainerHolidays).values({
    id,
    trainerId,
    startAt,
    endAt,
    label,
    createdAt,
  });

  return { id, trainerId, startAt, endAt, label, createdAt };
}

export async function updateHoliday(
  trainerId: string,
  holidayId: string,
  params: { startAt?: string; endAt?: string; label?: string | null },
) {
  const existing = await assertTrainerHoliday(trainerId, holidayId);
  const startAt = params.startAt ?? existing.startAt;
  const endAt = params.endAt ?? existing.endAt;
  const validated = assertValidHolidayRange(startAt, endAt);

  const patch: {
    startAt: string;
    endAt: string;
    label?: string | null;
  } = validated;

  if (params.label !== undefined) {
    patch.label = params.label?.trim() || null;
  }

  const db = getDb();
  await db
    .update(trainerHolidays)
    .set(patch)
    .where(eq(trainerHolidays.id, holidayId));

  return { ...existing, ...patch };
}

export async function deleteHoliday(trainerId: string, holidayId: string) {
  await assertTrainerHoliday(trainerId, holidayId);
  const db = getDb();
  await db.delete(trainerHolidays).where(eq(trainerHolidays.id, holidayId));
}

export function assertSlotNotDuringHoliday(
  slotStart: string,
  slotEnd: string,
  holidays: HolidayPeriod[],
) {
  const holiday = findOverlappingHoliday(slotStart, slotEnd, holidays);
  if (!holiday) return;

  throw new Error(
    `This time falls during ${holidayDisplayName(holiday).toLowerCase()}.`,
  );
}

