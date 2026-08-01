import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import {
  getOnboardingStatus,
  markInstallAppViewed,
} from "@/lib/services/onboarding";
import { getTrainerInvitations } from "@/lib/services/invites";
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
    expect(status.steps.find((step) => step.id === "install")?.complete).toBe(false);
    expect(status.steps.find((step) => step.id === "install")?.optional).toBe(true);
    expect(status.steps.find((step) => step.id === "invite")?.complete).toBe(false);
    expect(status.steps.find((step) => step.id === "invite")?.optional).toBe(true);
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
    await markInstallAppViewed(DEFAULT_TRAINER_ID);
    await getTrainerInvitations(DEFAULT_TRAINER_ID);

    const status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.complete).toBe(true);
    expect(status.allStepsComplete).toBe(true);
  });

  it("marks required complete but not allStepsComplete when client is missing", async () => {
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

    await getDb().delete(clients).where(eq(clients.trainerId, DEFAULT_TRAINER_ID));

    const status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.complete).toBe(true);
    expect(status.allStepsComplete).toBe(false);
    expect(status.steps.find((step) => step.id === "client")?.complete).toBe(false);
  });

  it("completes the install step after viewing the install page", async () => {
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

    let status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.complete).toBe(true);
    expect(status.steps.find((step) => step.id === "install")?.complete).toBe(false);
    expect(status.allStepsComplete).toBe(false);

    await markInstallAppViewed(DEFAULT_TRAINER_ID);

    status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.steps.find((step) => step.id === "install")?.complete).toBe(true);
    expect(status.steps.find((step) => step.id === "invite")?.complete).toBe(false);
    expect(status.allStepsComplete).toBe(false);
  });

  it("completes the invite step after viewing invitations", async () => {
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
    await markInstallAppViewed(DEFAULT_TRAINER_ID);

    let status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.complete).toBe(true);
    expect(status.steps.find((step) => step.id === "invite")?.complete).toBe(false);
    expect(status.allStepsComplete).toBe(false);

    await getTrainerInvitations(DEFAULT_TRAINER_ID);

    status = await getOnboardingStatus(DEFAULT_TRAINER_ID);
    expect(status.steps.find((step) => step.id === "invite")?.complete).toBe(true);
    expect(status.allStepsComplete).toBe(true);
  });
});
