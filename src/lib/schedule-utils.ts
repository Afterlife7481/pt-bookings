import { addDays, formatDate, parseDateOnly, startOfWeekMonday } from "@/lib/constants";

export function defaultWeekStart(): string {
  return formatDate(startOfWeekMonday(new Date()));
}

export function shiftWeekStart(weekStart: string, weeks: number): string {
  const d = parseDateOnly(weekStart);
  return formatDate(addDays(d, weeks * 7));
}
