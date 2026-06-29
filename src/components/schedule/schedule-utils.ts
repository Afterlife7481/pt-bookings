import { addDays, parseDateOnly, slotTimeLabel } from "@/lib/constants";
import {
  slotCoversGridRow,
  slotGridRowSpan,
} from "@/lib/schedule-grid";
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

export function dayNumberForWeekDay(weekStart: string, dayOfWeek: number): string {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${month} ${d.getDate()}`;
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

export function dateKeyFromStartAt(startAt: string): string {
  return startAt.split("T")[0] ?? "";
}

export function scheduleRowKey(dateKey: string, rowTime: string): string {
  return `${dateKey}-${rowTime}`;
}

export function entryStartTime(entry: ScheduleEntry): string {
  return slotTimeLabel(entry.startAt);
}

export function entryEndTime(entry: ScheduleEntry): string {
  return slotTimeLabel(entry.endAt);
}

export function buildScheduleGrid(_weekStart: string, entries: ScheduleEntry[]) {
  const map = new Map<string, ScheduleEntry>();
  for (const entry of entries) {
    const dateKey = dateKeyFromStartAt(entry.startAt);
    map.set(scheduleRowKey(dateKey, entryStartTime(entry)), entry);
  }
  return map;
}

export function countEntriesForDate(
  entries: ScheduleEntry[],
  dateKey: string,
): number {
  return entries.filter((e) => dateKeyFromStartAt(e.startAt) === dateKey).length;
}

export function findEntryForScheduleRow(
  entries: ScheduleEntry[],
  dateKey: string,
  rowTime: string,
): { entry: ScheduleEntry; isStart: boolean } | null {
  const entry =
    entries.find((e) => {
      if (dateKeyFromStartAt(e.startAt) !== dateKey) return false;
      return slotCoversGridRow(
        entryStartTime(e),
        entryEndTime(e),
        rowTime,
      );
    }) ?? null;

  if (!entry) return null;

  return {
    entry,
    isStart: entryStartTime(entry) === rowTime,
  };
}

export function entryRowSpan(entry: ScheduleEntry): number {
  return slotGridRowSpan(entryStartTime(entry), entryEndTime(entry));
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
