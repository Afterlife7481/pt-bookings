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

/** Monday-first order used by day view navigation. */
export const DAY_VIEW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function adjacentDaySelection(
  selectedDay: number,
  delta: -1 | 1,
): { dayOfWeek: number; weekDelta: -1 | 0 | 1 } {
  const index = DAY_VIEW_ORDER.indexOf(
    selectedDay as (typeof DAY_VIEW_ORDER)[number],
  );
  const currentIndex = index === -1 ? 0 : index;
  const nextIndex = currentIndex + delta;

  if (nextIndex < 0) {
    return { dayOfWeek: 0, weekDelta: -1 };
  }
  if (nextIndex >= DAY_VIEW_ORDER.length) {
    return { dayOfWeek: 1, weekDelta: 1 };
  }
  return { dayOfWeek: DAY_VIEW_ORDER[nextIndex]!, weekDelta: 0 };
}

/** True when the calendar day is strictly before today. */
export function isPastWeekDay(
  weekStart: string,
  dayOfWeek: number,
  now: Date = new Date(),
): boolean {
  const day = dateForWeekDay(weekStart, dayOfWeek);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  day.setHours(0, 0, 0, 0);
  return day.getTime() < today.getTime();
}

/** True when the column date matches today. */
export function isTodayWeekDay(
  weekStart: string,
  dayOfWeek: number,
  now: Date = new Date(),
): boolean {
  const day = dateForWeekDay(weekStart, dayOfWeek);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  day.setHours(0, 0, 0, 0);
  return day.getTime() === today.getTime();
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

/** True when any session overlaps this display row (for hiding +Add). */
export function displayRowHasEntry(
  entries: ScheduleEntry[],
  dateKey: string,
  rowTime: string,
): boolean {
  return entries.some(
    (e) =>
      dateKeyFromStartAt(e.startAt) === dateKey &&
      slotCoversGridRow(entryStartTime(e), entryEndTime(e), rowTime),
  );
}

export function entriesForDate(
  entries: ScheduleEntry[],
  dateKey: string,
): ScheduleEntry[] {
  return entries.filter((e) => dateKeyFromStartAt(e.startAt) === dateKey);
}

export function entryRowSpan(entry: ScheduleEntry): number {
  return slotGridRowSpan(entryStartTime(entry), entryEndTime(entry));
}

export function bookedSlotColorClasses(recurring: boolean, onPastDay = false) {
  if (onPastDay) {
    return recurring
      ? "border-blue-400/80 bg-blue-600/45 text-white"
      : "border-slate-500/80 bg-slate-800/45 text-white";
  }

  return recurring
    ? "border-blue-300 bg-blue-600 text-white active:bg-blue-700"
    : "border-slate-400 bg-slate-800 text-white active:bg-slate-700";
}

export function bookedSlotSubtextClasses(recurring: boolean, onPastDay = false) {
  if (onPastDay) {
    return recurring ? "text-blue-50" : "text-slate-200";
  }

  return recurring ? "text-blue-100" : "text-slate-300";
}

export function openSlotColorClasses(
  lm: ScheduleEntry["lastMinute"],
  selected: boolean,
  onPastDay = false,
) {
  const isHeld = !!lm?.heldForClientId;
  const hasMatch = (lm?.eligibleCount ?? 0) > 0;

  if (onPastDay) {
    if (isHeld) {
      return cn(
        "border-purple-400/80 bg-purple-600/45 text-white",
        selected && "ring-2 ring-purple-300/80",
      );
    }
    if (hasMatch) {
      return cn(
        "border-amber-300/80 bg-amber-100/45",
        selected && "border-amber-400/90 bg-amber-100/60 ring-2 ring-amber-300/80",
      );
    }
    return cn(
      "border-green-300/80 bg-green-100/40",
      selected && "border-green-400/90 bg-green-100/55 ring-2 ring-green-300/80",
    );
  }

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
  onPastDay = false,
) {
  const isHeld = !!lm?.heldForClientId;
  const hasMatch = (lm?.eligibleCount ?? 0) > 0;

  if (onPastDay) {
    if (isHeld) {
      return line === "primary" ? "text-white" : "text-purple-100";
    }
    if (hasMatch) {
      return line === "primary" ? "text-amber-950" : "text-amber-800";
    }
    return line === "primary" ? "text-green-900" : "text-green-700";
  }

  if (isHeld) {
    return line === "primary" ? "text-white" : "text-purple-100";
  }
  if (hasMatch) {
    return line === "primary" ? "text-amber-900" : "text-amber-700";
  }
  return line === "primary" ? "text-green-800" : "text-green-600";
}
