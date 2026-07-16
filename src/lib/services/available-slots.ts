import { and, asc, eq, gte, lt, ne, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { locations, slots } from "@/lib/db/schema";
import {
  clientBookingWindowEndExclusive,
  slotDayOfWeek,
} from "@/lib/constants";
import { utcToWallClock, wallClockToUtcMs } from "@/lib/zoned-time";
import { getEnabledClientLocationIds } from "./locations";
import { getTrainerSettings } from "./settings";

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
  const { clientBookingWindowWeeks, timezone } = await getTrainerSettings(trainerId);
  const nowWall = utcToWallClock(new Date(), timezone);
  const max = clientBookingWindowEndExclusive(clientBookingWindowWeeks, timezone);

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
        gte(slots.startAt, nowWall),
        lt(slots.startAt, max),
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
    return wallClockToUtcMs(a.startAt, timezone) - wallClockToUtcMs(b.startAt, timezone);
  });
}
