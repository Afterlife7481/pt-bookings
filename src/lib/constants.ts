export const SESSION_DURATION_MINUTES = 60;

/** Slot start/end times must fall on this grid (e.g. 09:00, 09:30). */
export const SCHEDULE_TIME_STEP_MINUTES = 30;

/** HTML time input step attribute (seconds). */
export const SCHEDULE_TIME_INPUT_STEP_SECONDS =
  SCHEDULE_TIME_STEP_MINUTES * 60;
export const DEFAULT_CLIENT_BOOKING_WINDOW_WEEKS = 2;
export const MIN_CLIENT_BOOKING_WINDOW_WEEKS = 1;
export const MAX_CLIENT_BOOKING_WINDOW_WEEKS = 52;

export function formatBookingWindowWeeks(weeks: number): string {
  if (weeks === 1) return "this week";
  if (weeks === 2) return "this week and next week";
  return `this week and the next ${weeks - 1} weeks`;
}

/** Exclusive upper bound: Monday 00:00 after the last bookable calendar week. */
export function clientBookingWindowEndExclusive(
  weeks: number,
  from: Date = new Date(),
): string {
  const currentWeekStart = startOfWeekMonday(from);
  const endExclusive = addDays(currentWeekStart, weeks * 7);
  return toLocalDateTimeString(parseTimeOnDate(formatDate(endExclusive), "00:00"));
}

export function isWithinClientBookingWindow(
  slotStartAt: string,
  weeks: number,
  now: Date = new Date(),
): boolean {
  const slotTime = parseLocalDateTime(slotStartAt);
  if (slotTime.getTime() < now.getTime()) return false;
  const endExclusive = parseLocalDateTime(
    clientBookingWindowEndExclusive(weeks, now),
  );
  return slotTime.getTime() < endExclusive.getTime();
}
export const CHANGE_DEADLINE_HOURS = 36;
export const DEFAULT_CANCEL_DEADLINE_HOURS = 36;
export const DEFAULT_LAST_MINUTE_OFFER_LOCK_HOURS = 1;
export const CHANGE_TIMEOUT_MINUTES = 30;

export const DEFAULT_TRAINER_ID = "trainer_default";
export const SESSION_COOKIE = "pt_session";
export const DEFAULT_TIMEZONE = "Europe/London";

export const SESSION_PAYMENT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

export type SessionPaymentType = (typeof SESSION_PAYMENT_TYPES)[number]["value"];

export function sessionPaymentTypeLabel(
  value: SessionPaymentType | null | undefined,
): string {
  if (!value) return "Not set";
  return (
    SESSION_PAYMENT_TYPES.find((option) => option.value === value)?.label ??
    value
  );
}

export function parseSessionPaymentType(
  value: unknown,
): SessionPaymentType | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Invalid payment type");
  }
  if (
    !SESSION_PAYMENT_TYPES.some((option) => option.value === value)
  ) {
    throw new Error("Invalid payment type");
  }
  return value as SessionPaymentType;
}

export const TRAINER_TIMEZONE_OPTIONS = [
  { value: "Europe/London", label: "United Kingdom (London)" },
  { value: "Europe/Dublin", label: "Ireland (Dublin)" },
  { value: "Europe/Paris", label: "Central Europe (Paris)" },
  { value: "Europe/Berlin", label: "Central Europe (Berlin)" },
  { value: "Europe/Madrid", label: "Spain (Madrid)" },
  { value: "America/New_York", label: "US Eastern (New York)" },
  { value: "America/Chicago", label: "US Central (Chicago)" },
  { value: "America/Denver", label: "US Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "US Pacific (Los Angeles)" },
  { value: "America/Toronto", label: "Canada Eastern (Toronto)" },
  { value: "Australia/Sydney", label: "Australia (Sydney)" },
  { value: "Australia/Melbourne", label: "Australia (Melbourne)" },
  { value: "Pacific/Auckland", label: "New Zealand (Auckland)" },
  { value: "Asia/Dubai", label: "UAE (Dubai)" },
  { value: "Asia/Singapore", label: "Singapore" },
] as const;

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function addHours(iso: string, hours: number): string {
  return addMinutes(iso, hours * 60);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function parseTimeOnDate(dateStr: string, time: string): Date {
  const d = parseDateOnly(dateStr);
  const [hours, minutes] = time.split(":").map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Local datetime string without timezone shift (YYYY-MM-DDTHH:mm:ss) */
export function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function slotTimeLabel(startAt: string): string {
  const [, timePart] = startAt.split("T");
  return timePart?.slice(0, 5) ?? "00:00";
}

export function slotDayOfWeek(startAt: string): number {
  const [datePart] = startAt.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function formatSlotLabel(isoStart: string, isoEnd?: string | null): string {
  const [datePart, timePart] = isoStart.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const start = timePart?.slice(0, 5) ?? "";
  const dateLabel = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (!isoEnd) return `${dateLabel} ${start}`;
  const end = isoEnd.split("T")[1]?.slice(0, 5) ?? "";
  return `${dateLabel} ${start}–${end}`;
}

export function hoursUntil(iso: string): number {
  const d = parseLocalDateTime(iso);
  return (d.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function parseLocalDateTime(iso: string): Date {
  const [datePart, timePart = "00:00:00"] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss = 0] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, ss);
}

export function isWithinBookingDeadline(
  slotStartAt: string,
  deadlineHours: number,
): boolean {
  return hoursUntil(slotStartAt) < deadlineHours;
}

export function isInactiveBookingStatus(status: string): boolean {
  return status === "canceled" || status === "voided";
}

export function normalizeAppBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:3000";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.includes("localhost") || trimmed.startsWith("127.0.0.1")) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function resolveAppBaseUrlRaw(): string {
  if (process.env.APP_BASE_URL?.trim()) {
    return process.env.APP_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return "http://localhost:3000";
}

export function appBaseUrl(): string {
  return normalizeAppBaseUrl(resolveAppBaseUrlRaw());
}

/** Absolute app URL for redirects (use instead of request.url behind Railway/proxies). */
export function appUrl(path: string): URL {
  return new URL(path, appBaseUrl());
}

export function clientHomeUrl(token: string): string {
  return `${appBaseUrl()}/c/${token}`;
}

export function bookingUrl(token: string): string {
  return `${appBaseUrl()}/s/${token}`;
}

export function interestUrl(token: string): string {
  return `${appBaseUrl()}/interest/${token}`;
}

export function interestClaimUrl(slotId: string, clientId: string): string {
  return `${appBaseUrl()}/interest/claim?slotId=${slotId}&clientId=${clientId}`;
}

export const DEFAULT_SCHEDULE_START = "07:00";
export const DEFAULT_SCHEDULE_END = "21:00";
export const DEFAULT_SCHEDULE_DEFAULT_VIEW = "week" as const;

export function parseTimeToHour(time: string): number {
  return parseInt(time.split(":")[0] ?? "0", 10);
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return formatMinutesAsTime(parseTimeToMinutes(time) + minutes);
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function defaultSlotEndTime(
  startTime: string,
  durationMinutes = SESSION_DURATION_MINUTES,
): string {
  return addMinutesToTime(startTime, durationMinutes);
}

export function slotDurationMinutes(startTime: string, endTime: string): number {
  return parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
}

export function assertValidTimeRange(startTime: string, endTime: string) {
  if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
    throw new Error("End time must be after start time");
  }
}

export function isScheduleTimeAligned(
  time: string,
  stepMinutes = SCHEDULE_TIME_STEP_MINUTES,
): boolean {
  return parseTimeToMinutes(time) % stepMinutes === 0;
}

export function assertValidScheduleSlotTimes(startTime: string, endTime: string) {
  assertValidTimeRange(startTime, endTime);
  if (!isScheduleTimeAligned(startTime)) {
    throw new Error(
      "Start time must use 30-minute increments (for example 09:00 or 09:30, not 09:45).",
    );
  }
  if (!isScheduleTimeAligned(endTime)) {
    throw new Error(
      "End time must use 30-minute increments (for example 10:00 or 10:30, not 10:15).",
    );
  }
}

export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const a0 = parseTimeToMinutes(aStart);
  const a1 = parseTimeToMinutes(aEnd);
  const b0 = parseTimeToMinutes(bStart);
  const b1 = parseTimeToMinutes(bEnd);
  return a0 < b1 && b0 < a1;
}

export function hoursInScheduleRange(startTime: string, endTime: string): number[] {
  const start = parseTimeToHour(startTime);
  const end = parseTimeToHour(endTime);
  if (end <= start) return [];
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
