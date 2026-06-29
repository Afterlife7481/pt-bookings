import { describe, expect, it } from "vitest";
import {
  getTrainerSettings,
  updateTrainerSettings,
} from "@/lib/services/settings";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

describe("updateTrainerSettings", () => {
  it("defaults client booking window to 2 weeks", async () => {
    await seedTestFixtures();
    const settings = await getTrainerSettings(DEFAULT_TRAINER_ID);
    expect(settings.clientBookingWindowWeeks).toBe(2);
  });

  it("defaults schedule view to week", async () => {
    await seedTestFixtures();
    const settings = await getTrainerSettings(DEFAULT_TRAINER_ID);
    expect(settings.scheduleDefaultView).toBe("week");
  });

  it("accepts valid client booking window weeks", async () => {
    await seedTestFixtures();
    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      clientBookingWindowWeeks: 3,
    });
    const settings = await getTrainerSettings(DEFAULT_TRAINER_ID);
    expect(settings.clientBookingWindowWeeks).toBe(3);
  });

  it("rejects invalid client booking window weeks", async () => {
    await seedTestFixtures();
    await expect(
      updateTrainerSettings(DEFAULT_TRAINER_ID, {
        clientBookingWindowWeeks: 0,
      }),
    ).rejects.toThrow(/Client booking window must be between/);
  });
});
