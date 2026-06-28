import { addDays, formatDate, parseDateOnly } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ScheduleEntry } from "@/lib/services/schedule";

export function dateForWeekDay(weekStart: string, dayOfWeek: number): Date {
  const monday = parseDateOnly(weekStart);
  const mondayDow = monday.getDay();
  const offset = (dayOfWeek - mondayDow + 7) % 7;
  return addDays(monday, offset);
}

export function dayHeader(weekStart: string, dayOfWeek: number): string {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function dayShortDate(weekStart: string, dayOfWeek: number): string {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function defaultSelectedDay(weekStart: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 6);
  if (today >= start && today <= end) {
    return today.getDay();
  }
  return 1;
}

export function isPastSlot(
  weekStart: string,
  dayOfWeek: number,
  hour: number,
  nowMs: number | null,
): boolean {
  if (nowMs === null) return false;
  const d = dateForWeekDay(weekStart, dayOfWeek);
  d.setHours(hour, 0, 0, 0);
  return d.getTime() < nowMs;
}

export function hourFromStartAt(startAt: string): number {
  return parseInt(startAt.split("T")[1]?.slice(0, 2) ?? "0", 10);
}

export function dateKeyFromStartAt(startAt: string): string {
  return startAt.split("T")[0] ?? "";
}

export function buildScheduleGrid(_weekStart: string, entries: ScheduleEntry[]) {
  const map = new Map<string, ScheduleEntry>();
  for (const entry of entries) {
    const dateKey = dateKeyFromStartAt(entry.startAt);
    const hour = hourFromStartAt(entry.startAt);
    map.set(`${dateKey}-${hour}`, entry);
  }
  return map;
}

export function openSlotColorClasses(
  lm: ScheduleEntry["lastMinute"],
  selected: boolean,
) {
  const isHeld = !!lm?.heldForClientId;
  const hasMatch = (lm?.eligibleCount ?? 0) > 0;

  if (isHeld) {
    return cn(
      "border-purple-400 bg-purple-600 text-white active:bg-purple-700",
      selected && "ring-2 ring-purple-300",
    );
  }
  if (hasMatch) {
    return cn(
      "border-amber-200 bg-amber-50 active:border-amber-300 active:bg-amber-100",
      selected && "border-amber-400 bg-amber-100 ring-2 ring-amber-300",
    );
  }
  return cn(
    "border-green-200 bg-green-50 active:border-green-300 active:bg-green-100",
    selected && "border-green-400 bg-green-100 ring-2 ring-green-300",
  );
}

export function openSlotTextClasses(
  lm: ScheduleEntry["lastMinute"],
  line: "primary" | "secondary",
) {
  const isHeld = !!lm?.heldForClientId;
  const hasMatch = (lm?.eligibleCount ?? 0) > 0;

  if (isHeld) {
    return line === "primary" ? "text-white" : "text-purple-100";
  }
  if (hasMatch) {
    return line === "primary" ? "text-amber-900" : "text-amber-700";
  }
  return line === "primary" ? "text-green-800" : "text-green-600";
}
