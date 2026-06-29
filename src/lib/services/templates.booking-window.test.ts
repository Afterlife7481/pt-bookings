import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailableSlotsForChange } from "@/lib/services/templates";
import { updateTrainerSettings } from "@/lib/services/settings";
import { addScheduleSlot } from "@/lib/services/schedule";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

const FIXED_NOW = new Date("2026-06-30T12:00:00");

describe("getAvailableSlotsForChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("respects calendar-week booking window (1 week = this week only)", async () => {
    const fixtures = await seedTestFixtures();
    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      clientBookingWindowWeeks: 1,
    });

    const { slotId: thisWeekSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      "2026-06-29",
      3,
      "11:00",
      fixtures.locationId,
    );

    const { slotId: nextWeekSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      "2026-07-06",
      2,
      "11:00",
      fixtures.locationId,
    );

    const available = await getAvailableSlotsForChange(
      DEFAULT_TRAINER_ID,
      undefined,
      undefined,
      fixtures.clientId,
    );

    const ids = available.map((slot) => slot.id);
    expect(ids).toContain(thisWeekSlotId);
    expect(ids).not.toContain(nextWeekSlotId);
  });

  it("includes next calendar week when window is 2 weeks", async () => {
    const fixtures = await seedTestFixtures();
    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      clientBookingWindowWeeks: 2,
    });

    const { slotId: nextWeekSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      "2026-07-06",
      2,
      "11:00",
      fixtures.locationId,
    );

    const { slotId: thirdWeekSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      "2026-07-13",
      2,
      "11:00",
      fixtures.locationId,
    );

    const available = await getAvailableSlotsForChange(
      DEFAULT_TRAINER_ID,
      undefined,
      undefined,
      fixtures.clientId,
    );

    const ids = available.map((slot) => slot.id);
    expect(ids).toContain(nextWeekSlotId);
    expect(ids).not.toContain(thirdWeekSlotId);
  });
});
