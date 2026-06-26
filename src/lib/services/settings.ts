import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainers } from "@/lib/db/schema";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  DEFAULT_CANCEL_DEADLINE_HOURS,
  parseTimeToHour,
} from "@/lib/constants";

export type TrainerSettings = {
  name: string;
  email: string;
  timezone: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  cancelDeadlineHours: number;
};

export async function getTrainerSettings(
  trainerId: string,
): Promise<TrainerSettings> {
  const db = getDb();
  const trainer = await db.query.trainers.findFirst({
    where: eq(trainers.id, trainerId),
  });
  if (!trainer) throw new Error("Trainer not found");

  return {
    name: trainer.name,
    email: trainer.email,
    timezone: trainer.timezone,
    scheduleStartTime: trainer.scheduleStartTime ?? DEFAULT_SCHEDULE_START,
    scheduleEndTime: trainer.scheduleEndTime ?? DEFAULT_SCHEDULE_END,
    cancelDeadlineHours:
      trainer.cancelDeadlineHours ?? DEFAULT_CANCEL_DEADLINE_HOURS,
  };
}

export async function updateTrainerSettings(
  trainerId: string,
  updates: Partial<
    Pick<
      TrainerSettings,
      "scheduleStartTime" | "scheduleEndTime" | "timezone" | "cancelDeadlineHours"
    >
  >,
) {
  const db = getDb();

  if (updates.cancelDeadlineHours !== undefined) {
    const hours = updates.cancelDeadlineHours;
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      throw new Error("Cancellation threshold must be between 1 and 168 hours");
    }
  }

  if (updates.scheduleStartTime !== undefined || updates.scheduleEndTime !== undefined) {
    const current = await getTrainerSettings(trainerId);
    const start = updates.scheduleStartTime ?? current.scheduleStartTime;
    const end = updates.scheduleEndTime ?? current.scheduleEndTime;

    if (parseTimeToHour(end) <= parseTimeToHour(start)) {
      throw new Error("End time must be after start time");
    }
  }

  await db
    .update(trainers)
    .set({
      ...(updates.scheduleStartTime !== undefined && {
        scheduleStartTime: updates.scheduleStartTime,
      }),
      ...(updates.scheduleEndTime !== undefined && {
        scheduleEndTime: updates.scheduleEndTime,
      }),
      ...(updates.timezone !== undefined && { timezone: updates.timezone }),
      ...(updates.cancelDeadlineHours !== undefined && {
        cancelDeadlineHours: updates.cancelDeadlineHours,
      }),
    })
    .where(eq(trainers.id, trainerId));
}
