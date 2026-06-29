import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainers } from "@/lib/db/schema";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  DEFAULT_CANCEL_DEADLINE_HOURS,
  DEFAULT_LAST_MINUTE_OFFER_LOCK_HOURS,
  DEFAULT_CLIENT_BOOKING_WINDOW_WEEKS,
  MIN_CLIENT_BOOKING_WINDOW_WEEKS,
  MAX_CLIENT_BOOKING_WINDOW_WEEKS,
  isValidIanaTimezone,
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
  clientBookingWindowWeeks: number;
  bankAccountNumber: string | null;
  bankSortCode: string | null;
  bankName: string | null;
  paymentPayeeName: string | null;
};

function normalizeBankAccountNumber(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 8) {
    throw new Error("Account number must be 6–8 digits");
  }
  return digits;
}

function normalizeBankSortCode(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 6) {
    throw new Error("Sort code must be 6 digits");
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

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
    clientBookingWindowWeeks:
      trainer.clientBookingWindowWeeks ?? DEFAULT_CLIENT_BOOKING_WINDOW_WEEKS,
    bankAccountNumber: trainer.bankAccountNumber ?? null,
    bankSortCode: trainer.bankSortCode ?? null,
    bankName: trainer.bankName ?? null,
    paymentPayeeName: trainer.paymentPayeeName ?? null,
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
      | "clientBookingWindowWeeks"
      | "bankAccountNumber"
      | "bankSortCode"
      | "bankName"
      | "paymentPayeeName"
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

  if (updates.clientBookingWindowWeeks !== undefined) {
    const weeks = updates.clientBookingWindowWeeks;
    if (
      !Number.isInteger(weeks) ||
      weeks < MIN_CLIENT_BOOKING_WINDOW_WEEKS ||
      weeks > MAX_CLIENT_BOOKING_WINDOW_WEEKS
    ) {
      throw new Error(
        `Client booking window must be between ${MIN_CLIENT_BOOKING_WINDOW_WEEKS} and ${MAX_CLIENT_BOOKING_WINDOW_WEEKS} weeks`,
      );
    }
  }

  if (updates.timezone !== undefined) {
    const timezone = updates.timezone.trim();
    if (!timezone || !isValidIanaTimezone(timezone)) {
      throw new Error("Invalid time zone");
    }
    updates.timezone = timezone;
  }

  if (updates.bankAccountNumber !== undefined) {
    updates.bankAccountNumber = normalizeBankAccountNumber(
      updates.bankAccountNumber,
    );
  }

  if (updates.bankSortCode !== undefined) {
    updates.bankSortCode = normalizeBankSortCode(updates.bankSortCode);
  }

  if (updates.bankName !== undefined) {
    updates.bankName = normalizeOptionalText(updates.bankName);
  }

  if (updates.paymentPayeeName !== undefined) {
    updates.paymentPayeeName = normalizeOptionalText(updates.paymentPayeeName);
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
      ...(updates.clientBookingWindowWeeks !== undefined && {
        clientBookingWindowWeeks: updates.clientBookingWindowWeeks,
      }),
      ...(updates.bankAccountNumber !== undefined && {
        bankAccountNumber: updates.bankAccountNumber,
      }),
      ...(updates.bankSortCode !== undefined && {
        bankSortCode: updates.bankSortCode,
      }),
      ...(updates.bankName !== undefined && {
        bankName: updates.bankName,
      }),
      ...(updates.paymentPayeeName !== undefined && {
        paymentPayeeName: updates.paymentPayeeName,
      }),
    })
    .where(eq(trainers.id, trainerId));
}
