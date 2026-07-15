import {
  slotDayOfWeek,
  slotTimeLabel,
} from "@/lib/constants";

export type LastMinuteSlotRef = { dayOfWeek: number; startTime: string };

export type LastMinuteTemplateSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
};

export type LastMinuteOfferStatus =
  | "offered"
  | "accepted"
  | "expired"
  | "superseded"
  | "declined";

export function templateSlotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}-${startTime}`;
}

export function filterTemplateSlotsForClient(
  templateSlots: LastMinuteTemplateSlot[],
  enabledLocationIds: string[],
): LastMinuteTemplateSlot[] {
  if (enabledLocationIds.length === 0) return [];
  const enabled = new Set(enabledLocationIds);
  return templateSlots.filter((slot) => enabled.has(slot.locationId));
}

export function filterPreferencesToTemplateSlots(
  preferences: LastMinuteSlotRef[],
  templateSlots: LastMinuteTemplateSlot[],
): LastMinuteSlotRef[] {
  const allowed = new Set(
    templateSlots.map((slot) => templateSlotKey(slot.dayOfWeek, slot.startTime)),
  );
  return preferences.filter((pref) =>
    allowed.has(templateSlotKey(pref.dayOfWeek, pref.startTime)),
  );
}

export function slotMatchesPreference(
  startAt: string,
  pref: LastMinuteSlotRef,
): boolean {
  return (
    slotDayOfWeek(startAt) === pref.dayOfWeek &&
    slotTimeLabel(startAt) === pref.startTime
  );
}
