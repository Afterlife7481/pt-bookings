/** Monday-first day columns for weekly grids. */
import {
  SCHEDULE_TIME_STEP_MINUTES,
  formatMinutesAsTime,
  parseTimeToMinutes,
} from "@/lib/constants";

export { SCHEDULE_TIME_STEP_MINUTES as SCHEDULE_GRID_STEP_MINUTES };

export const WEEK_DAYS = [
  { value: 1, label: "Mon", longLabel: "Monday" },
  { value: 2, label: "Tue", longLabel: "Tuesday" },
  { value: 3, label: "Wed", longLabel: "Wednesday" },
  { value: 4, label: "Thu", longLabel: "Thursday" },
  { value: 5, label: "Fri", longLabel: "Friday" },
  { value: 6, label: "Sat", longLabel: "Saturday" },
  { value: 0, label: "Sun", longLabel: "Sunday" },
] as const;

export type WeekDayColumn = (typeof WEEK_DAYS)[number];

/** Full day names for selects and display (Monday-first). */
export const DAY_OPTIONS = WEEK_DAYS.map(({ value, longLabel }) => ({
  value,
  label: longLabel,
}));

export function dayOfWeekLabel(dayOfWeek: number): string {
  return WEEK_DAYS.find((d) => d.value === dayOfWeek)?.label ?? "?";
}

export function dayOfWeekLongLabel(dayOfWeek: number): string {
  return WEEK_DAYS.find((d) => d.value === dayOfWeek)?.longLabel ?? "?";
}

export function hourToStartTime(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function hourFromTime(startTime: string): number {
  return parseInt(startTime.split(":")[0] ?? "0", 10);
}

export function formatScheduleHour(hour: number): string {
  return hourToStartTime(hour);
}

export function recurringSlotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}-${startTime}`;
}

export function parseRecurringSlotKey(key: string): {
  dayOfWeek: number;
  startTime: string;
} {
  const dash = key.indexOf("-");
  return {
    dayOfWeek: Number(key.slice(0, dash)),
    startTime: key.slice(dash + 1),
  };
}

export function dayHourKey(dayOfWeek: number, hour: number): string {
  return `${dayOfWeek}-${hour}`;
}

export function dayHeaderInitial(day: WeekDayColumn): { primary: string } {
  return { primary: day.label.charAt(0) };
}

export function dayHeaderShort(day: WeekDayColumn): { primary: string } {
  return { primary: day.label };
}

export function timeRowsInScheduleRange(
  startTime: string,
  endTime: string,
  stepMinutes = SCHEDULE_TIME_STEP_MINUTES,
): string[] {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (endMin <= startMin) return [];
  const rows: string[] = [];
  for (let t = startMin; t < endMin; t += stepMinutes) {
    rows.push(formatMinutesAsTime(t));
  }
  return rows;
}

export function slotGridRowSpan(
  startTime: string,
  endTime: string,
  stepMinutes = SCHEDULE_TIME_STEP_MINUTES,
): number {
  const duration = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
  if (duration <= 0) return 1;
  return Math.max(1, duration / stepMinutes);
}

export function slotCoversGridRow(
  startTime: string,
  endTime: string,
  rowTime: string,
  stepMinutes = SCHEDULE_TIME_STEP_MINUTES,
): boolean {
  const rowStart = parseTimeToMinutes(rowTime);
  const rowEnd = rowStart + stepMinutes;
  const slotStart = parseTimeToMinutes(startTime);
  const slotEnd = parseTimeToMinutes(endTime);
  return slotStart < rowEnd && rowStart < slotEnd;
}

export function scheduleGridTimeLabel(
  rowTime: string,
  compact: boolean,
): string {
  const [hh, mm] = rowTime.split(":");
  if (mm === "00") {
    return compact ? String(parseInt(hh ?? "0", 10)) : rowTime;
  }
  return compact ? `:${mm}` : rowTime;
}
