import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  locations,
  templateSlots,
  weeklyTemplates,
} from "@/lib/db/schema";
import {
  assertValidScheduleSlotTimes,
  nowIso,
  parseTimeToMinutes,
  timeRangesOverlap,
} from "@/lib/constants";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import { assertTrainerLocation } from "./locations";

const WEEKLY_TEMPLATE_NAME = "Weekly template";

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

async function insertTemplateSlotsTx(
  tx: TemplateDbTx,
  templateId: string,
  normalized: TemplateSlotInput[],
) {
  for (const s of normalized) {
    await tx.insert(templateSlots).values({
      id: nanoid(),
      templateId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      locationId: s.locationId,
    });
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
    await db.transaction(async (tx) => {
      await tx
        .delete(templateSlots)
        .where(eq(templateSlots.templateId, existing.id));
      await insertTemplateSlotsTx(tx, existing.id, normalized);
    });
    const {
      pruneLastMinutePreferencesToTemplateSlots,
      notifyClientsOfLastMinutePrune,
    } = await import("./last-minute");
    const pruneResult = await pruneLastMinutePreferencesToTemplateSlots(
      trainerId,
      normalized,
    );
    await notifyClientsOfLastMinutePrune(trainerId, pruneResult.prunedClients);
    return existing.id;
  }

  const id = nanoid();
  await db.transaction(async (tx) => {
    await tx.insert(weeklyTemplates).values({
      id,
      trainerId,
      name: WEEKLY_TEMPLATE_NAME,
      createdAt: nowIso(),
    });
    await insertTemplateSlotsTx(tx, id, normalized);
  });
  const {
    pruneLastMinutePreferencesToTemplateSlots,
    notifyClientsOfLastMinutePrune,
  } = await import("./last-minute");
  const pruneResult = await pruneLastMinutePreferencesToTemplateSlots(
    trainerId,
    normalized,
  );
  await notifyClientsOfLastMinutePrune(trainerId, pruneResult.prunedClients);
  return id;
}

export type { ApplyTemplateResult } from "./template-apply";
export {
  applyTemplateToWeek,
  applyTrainerTemplateToWeek,
} from "./template-apply";
export type { AvailableSlotOption } from "./available-slots";
export { getAvailableSlotsForChange } from "./available-slots";
