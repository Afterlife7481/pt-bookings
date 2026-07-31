import {
  addDays,
  formatDate,
  localTodayDateKey,
  parseDateOnly,
  startOfWeekMonday,
} from "@/lib/constants";

export function defaultWeekStart(): string {
  return formatDate(startOfWeekMonday(parseDateOnly(localTodayDateKey())));
}

export function shiftWeekStart(weekStart: string, weeks: number): string {
  const d = parseDateOnly(weekStart);
  return formatDate(addDays(d, weeks * 7));
}
