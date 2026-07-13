import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addScheduleSlot } from "@/lib/services/schedule";
import { createHoliday } from "@/lib/services/holidays";
import {
  applyTemplateToWeek,
  saveTrainerTemplate,
} from "@/lib/services/templates";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

const FIXED_NOW = new Date("2026-06-30T12:00:00");
const WEEK_START = "2026-06-29";

describe("template apply with holidays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips template slots that overlap time off and reports conflicts", async () => {
    const fixtures = await seedTestFixtures();

    await createHoliday(DEFAULT_TRAINER_ID, {
      label: "Summer break",
      startAt: "2026-07-01T08:00:00",
      endAt: "2026-07-01T18:00:00",
    });

    const templateId = await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: 3,
        startTime: "11:00",
        endTime: "12:00",
        locationId: fixtures.locationId,
      },
      {
        dayOfWeek: 4,
        startTime: "11:00",
        endTime: "12:00",
        locationId: fixtures.locationId,
      },
    ]);

    const result = await applyTemplateToWeek(
      templateId,
      WEEK_START,
      DEFAULT_TRAINER_ID,
    );

    expect(result.slotsCreated).toBe(1);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toContain("Summer break");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("blocks manual slot creation during time off", async () => {
    const fixtures = await seedTestFixtures();

    await createHoliday(DEFAULT_TRAINER_ID, {
      startAt: "2026-07-02T10:00:00",
      endAt: "2026-07-02T12:00:00",
    });

    await expect(
      addScheduleSlot(
        DEFAULT_TRAINER_ID,
        WEEK_START,
        4,
        "11:00",
        fixtures.locationId,
      ),
    ).rejects.toThrow(/time off/i);
  });
});
