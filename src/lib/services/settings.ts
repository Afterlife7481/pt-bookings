import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainers } from "@/lib/db/schema";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  DEFAULT_CANCEL_DEADLINE_HOURS,
  DEFAULT_LAST_MINUTE_OFFER_LOCK_HOURS,
  parseTimeToHour,
} from "@/lib/constants";

export type ScheduleDefaultView = "day" | "week";

export type TrainerSettings = {
  name: string;
  email: string;
  timezone: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleDefaultView: ScheduleDefaultView;
  cancelDeadlineHours: number;
  lastMinuteOfferLockHours: number;
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
    scheduleDefaultView:
      trainer.scheduleDefaultView === "week" ? "week" : "day",
    cancelDeadlineHours:
      trainer.cancelDeadlineHours ?? DEFAULT_CANCEL_DEADLINE_HOURS,
    lastMinuteOfferLockHours:
      trainer.lastMinuteOfferLockHours ?? DEFAULT_LAST_MINUTE_OFFER_LOCK_HOURS,
  };
}

export async function updateTrainerSettings(
  trainerId: string,
  updates: Partial<
    Pick<
      TrainerSettings,
      | "scheduleStartTime"
      | "scheduleEndTime"
      | "scheduleDefaultView"
      | "timezone"
      | "cancelDeadlineHours"
      | "lastMinuteOfferLockHours"
    >
  >,
) {
  const db = getDb();

  if (updates.scheduleDefaultView !== undefined) {
    if (updates.scheduleDefaultView !== "day" && updates.scheduleDefaultView !== "week") {
      throw new Error("Schedule default view must be day or week");
    }
  }

  if (updates.cancelDeadlineHours !== undefined) {
    const hours = updates.cancelDeadlineHours;
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      throw new Error("Cancellation threshold must be between 1 and 168 hours");
    }
  }

  if (updates.lastMinuteOfferLockHours !== undefined) {
    const hours = updates.lastMinuteOfferLockHours;
    if (!Number.isInteger(hours) || hours < 1 || hours > 72) {
      throw new Error("Last-minute offer lock must be between 1 and 72 hours");
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
      ...(updates.scheduleDefaultView !== undefined && {
        scheduleDefaultView: updates.scheduleDefaultView,
      }),
      ...(updates.timezone !== undefined && { timezone: updates.timezone }),
      ...(updates.cancelDeadlineHours !== undefined && {
        cancelDeadlineHours: updates.cancelDeadlineHours,
      }),
      ...(updates.lastMinuteOfferLockHours !== undefined && {
        lastMinuteOfferLockHours: updates.lastMinuteOfferLockHours,
      }),
    })
    .where(eq(trainers.id, trainerId));
}
