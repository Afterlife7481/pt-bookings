import { count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, locations, trainers } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";
import { getTrainerTemplate } from "@/lib/services/templates";

export type OnboardingStepId =
  | "regional"
  | "location"
  | "schedule"
  | "template"
  | "client";

export type OnboardingStepStatus = {
  id: OnboardingStepId;
  label: string;
  description: string;
  href: string;
  optional?: boolean;
  complete: boolean;
};

export type OnboardingStatus = {
  /** All required (non-optional) steps are complete — unlocks the app. */
  complete: boolean;
  /** Every step including optional ones is complete. */
  allStepsComplete: boolean;
  steps: OnboardingStepStatus[];
};

const STEP_DEFINITIONS: Omit<OnboardingStepStatus, "complete">[] = [
  {
    id: "regional",
    label: "Set your regional settings",
    description: "Choose your time zone so session times display correctly.",
    href: "/dashboard/settings/regional",
  },
  {
    id: "location",
    label: "Add at least one location",
    description: "Every slot needs a place you train — studio, gym, park, or home visits.",
    href: "/dashboard/settings/locations",
  },
  {
    id: "schedule",
    label: "Set schedule start and end times",
    description: "Define the hours shown on your weekly diary.",
    href: "/dashboard/settings/schedule",
  },
  {
    id: "template",
    label: "Create your weekly template",
    description: "Lay out the slots you offer in a typical week — the backbone of the app.",
    href: "/dashboard/settings/templates",
  },
  {
    id: "client",
    label: "Add your first client",
    description: "Optional for now — you can add clients whenever you are ready.",
    href: "/dashboard/clients/new",
    optional: true,
  },
];

function isLegacyOnboarded(locationCount: number, templateSlotCount: number): boolean {
  return locationCount >= 1 && templateSlotCount >= 1;
}

export async function getOnboardingStatus(trainerId: string): Promise<OnboardingStatus> {
  const db = getDb();
  const trainer = await db.query.trainers.findFirst({
    where: eq(trainers.id, trainerId),
  });
  if (!trainer) throw new Error("Trainer not found");

  const [[locationRow], [clientRow], template] = await Promise.all([
    db
      .select({ count: count() })
      .from(locations)
      .where(eq(locations.trainerId, trainerId)),
    db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.trainerId, trainerId)),
    getTrainerTemplate(trainerId),
  ]);

  const locationCount = Number(locationRow?.count ?? 0);
  const clientCount = Number(clientRow?.count ?? 0);
  const templateSlotCount = template?.slots.length ?? 0;
  const legacy = isLegacyOnboarded(locationCount, templateSlotCount);

  const completion: Record<OnboardingStepId, boolean> = {
    regional: !!trainer.regionalSettingsConfiguredAt || legacy,
    location: locationCount >= 1,
    schedule: !!trainer.scheduleHoursConfiguredAt || legacy,
    template: templateSlotCount >= 1,
    client: clientCount >= 1,
  };

  const steps = STEP_DEFINITIONS.map((step) => ({
    ...step,
    complete: completion[step.id],
  }));

  const complete = steps
    .filter((step) => !step.optional)
    .every((step) => step.complete);
  const allStepsComplete = steps.every((step) => step.complete);

  return { complete, allStepsComplete, steps };
}

export async function markRegionalSettingsConfigured(trainerId: string) {
  const db = getDb();
  await db
    .update(trainers)
    .set({ regionalSettingsConfiguredAt: nowIso() })
    .where(eq(trainers.id, trainerId));
}

export async function markScheduleHoursConfigured(trainerId: string) {
  const db = getDb();
  await db
    .update(trainers)
    .set({ scheduleHoursConfiguredAt: nowIso() })
    .where(eq(trainers.id, trainerId));
}
