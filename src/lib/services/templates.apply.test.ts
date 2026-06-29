import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { slots } from "@/lib/db/schema";
import { createBookingForSlot } from "@/lib/services/bookings";
import { addScheduleSlot } from "@/lib/services/schedule";
import {
  applyTemplateToWeek,
  saveTrainerTemplate,
} from "@/lib/services/templates";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

const FIXED_NOW = new Date("2026-06-30T12:00:00");
const WEEK_START = "2026-06-29";

describe("applyTemplateToWeek edge cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips template slots that start before today", async () => {
    const fixtures = await seedTestFixtures();

    const templateId = await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        locationId: fixtures.locationId,
      },
      {
        dayOfWeek: 3,
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

    const db = getDb();
    const created = await db.query.slots.findMany({
      where: eq(slots.appliedWeekId, result.appliedWeekId),
    });
    expect(created).toHaveLength(1);
    expect(created[0]?.startAt).toBe("2026-07-01T11:00:00");
  });

  it("throws when non-canceled bookings exist in the target week", async () => {
    const fixtures = await seedTestFixtures();

    await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      WEEK_START,
      2,
      "10:00",
      fixtures.locationId,
    );

    const db = getDb();
    const bookedSlot = await db.query.slots.findFirst({
      where: eq(slots.startAt, "2026-06-30T10:00:00"),
    });
    if (!bookedSlot) {
      throw new Error("Expected booked slot in target week");
    }

    await createBookingForSlot({
      slotId: bookedSlot.id,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const templateId = await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: 3,
        startTime: "11:00",
        endTime: "12:00",
        locationId: fixtures.locationId,
      },
    ]);

    await expect(
      applyTemplateToWeek(templateId, WEEK_START, DEFAULT_TRAINER_ID),
    ).rejects.toThrow(
      "Cannot apply a template while client sessions are booked this week.",
    );
  });

  it("skips creating slots that already exist at the same start time", async () => {
    const fixtures = await seedTestFixtures();

    await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      WEEK_START,
      3,
      "11:00",
      fixtures.locationId,
    );

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

    const db = getDb();
    const wedSlots = await db.query.slots.findMany({
      where: eq(slots.startAt, "2026-07-01T11:00:00"),
    });
    expect(wedSlots).toHaveLength(1);
  });
});
