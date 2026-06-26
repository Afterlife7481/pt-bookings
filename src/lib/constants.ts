export const SESSION_DURATION_MINUTES = 60;
export const BOOKING_WINDOW_DAYS = 14;
export const CHANGE_DEADLINE_HOURS = 36;
export const DEFAULT_CANCEL_DEADLINE_HOURS = 36;
export const CHANGE_TIMEOUT_MINUTES = 30;

export const DEFAULT_TRAINER_ID = "trainer_default";

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
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

export function formatSlotLabel(iso: string): string {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const time = timePart?.slice(0, 5) ?? "";
  return `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
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
  overrideDeadline: boolean,
  deadlineHours: number,
): boolean {
  if (overrideDeadline) return false;
  return hoursUntil(slotStartAt) < deadlineHours;
}

/** @deprecated use isWithinBookingDeadline */
export function isWithinChangeDeadline(
  slotStartAt: string,
  override36h: boolean,
  deadlineHours: number = CHANGE_DEADLINE_HOURS,
): boolean {
  return isWithinBookingDeadline(slotStartAt, override36h, deadlineHours);
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

export function parseTimeToHour(time: string): number {
  return parseInt(time.split(":")[0] ?? "0", 10);
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
