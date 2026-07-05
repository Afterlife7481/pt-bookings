import { describe, expect, it } from "vitest";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import { updateTrainerSettings } from "@/lib/services/settings";
import { saveTrainerTemplate } from "@/lib/services/templates";

describe("onboarding status", () => {
  it("requires regional, location, schedule, and template for new trainers", async () => {
    await seedTestFixtures();
    const status = await getOnboardingStatus(DEFAULT_TRAINER_ID);

    expect(status.complete).toBe(false);
    expect(status.steps.find((step) => step.id === "regional")?.complete).toBe(false);
    expect(status.steps.find((step) => step.id === "location")?.complete).toBe(true);
    expect(status.steps.find((step) => step.id === "schedule")?.complete).toBe(false);
    expect(status.steps.find((step) => step.id === "template")?.complete).toBe(false);
    expect(status.steps.find((step) => step.id === "client")?.complete).toBe(true);
  });

  it("marks onboarding complete once required setup steps are done", async () => {
    const fixtures = await seedTestFixtures();

    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      timezone: "Europe/London",
    });
    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      scheduleStartTime: "07:00",
      scheduleEndTime: "21:00",
    });
    await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        locationId: fixtures.locationId,
      },
    ]);

    const status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.complete).toBe(true);
  });
});
