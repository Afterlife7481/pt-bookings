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

  it("defaults schedule view to day", async () => {
    await seedTestFixtures();
    const settings = await getTrainerSettings(DEFAULT_TRAINER_ID);
    expect(settings.scheduleDefaultView).toBe("day");
  });

  it("defaults currency to GBP and accepts updates", async () => {
    await seedTestFixtures();
    const initial = await getTrainerSettings(DEFAULT_TRAINER_ID);
    expect(initial.currency).toBe("GBP");

    await updateTrainerSettings(DEFAULT_TRAINER_ID, { currency: "EUR" });
    const updated = await getTrainerSettings(DEFAULT_TRAINER_ID);
    expect(updated.currency).toBe("EUR");
  });

  it("rejects unsupported currencies", async () => {
    await seedTestFixtures();
    await expect(
      updateTrainerSettings(DEFAULT_TRAINER_ID, { currency: "XXX" }),
    ).rejects.toThrow("Unsupported currency");
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
