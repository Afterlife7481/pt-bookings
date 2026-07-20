import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID, slotTimeLabel } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { slots } from "@/lib/db/schema";
import { createBookingForSlot } from "@/lib/services/bookings";
import {
  addScheduleSlot,
  updateScheduleSlot,
} from "@/lib/services/schedule";

describe("updateScheduleSlot", () => {
  it("updates day, times, and location for an open slot", async () => {
    const fixtures = await seedTestFixtures();

    await updateScheduleSlot(DEFAULT_TRAINER_ID, fixtures.slotId, {
      dayOfWeek: fixtures.slotDayOfWeek,
      startTime: "11:00",
      endTime: "11:50",
      locationId: fixtures.locationId,
    });

    const updated = await getDb().query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(updated).toBeTruthy();
    expect(slotTimeLabel(updated!.startAt)).toBe("11:00");
    expect(slotTimeLabel(updated!.endAt)).toBe("11:50");
  });

  it("rejects edits that overlap another slot", async () => {
    const fixtures = await seedTestFixtures();
    const otherStart = "11:00";
    await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      fixtures.weekStart,
      fixtures.slotDayOfWeek,
      otherStart,
      fixtures.locationId,
      "11:50",
    );

    await expect(
      updateScheduleSlot(DEFAULT_TRAINER_ID, fixtures.slotId, {
        dayOfWeek: fixtures.slotDayOfWeek,
        startTime: "10:30",
        endTime: "11:20",
        locationId: fixtures.locationId,
      }),
    ).rejects.toThrow(/overlaps/i);
  });

  it("allows back-to-back edits that only touch another slot", async () => {
    const fixtures = await seedTestFixtures();
    await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      fixtures.weekStart,
      fixtures.slotDayOfWeek,
      "11:00",
      fixtures.locationId,
      "11:50",
    );

    await updateScheduleSlot(DEFAULT_TRAINER_ID, fixtures.slotId, {
      dayOfWeek: fixtures.slotDayOfWeek,
      startTime: "10:10",
      endTime: "11:00",
      locationId: fixtures.locationId,
    });

    const updated = await getDb().query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slotTimeLabel(updated!.startAt)).toBe("10:10");
    expect(slotTimeLabel(updated!.endAt)).toBe("11:00");
  });

  it("rejects editing a booked slot", async () => {
    const fixtures = await seedTestFixtures();
    await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      isRecurring: false,
      sendConfirmation: false,
    });

    await expect(
      updateScheduleSlot(DEFAULT_TRAINER_ID, fixtures.slotId, {
        dayOfWeek: fixtures.slotDayOfWeek,
        startTime: "12:00",
        endTime: "12:50",
        locationId: fixtures.locationId,
      }),
    ).rejects.toThrow(/booking/i);
  });
});
