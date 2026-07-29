import {
  SCHEDULE_DISPLAY_STEP_MINUTES,
  addDays,
  addMinutesToTime,
  formatDate,
  parseDateOnly,
  parseLocalDateTime,
  parseTimeOnDate,
  slotTimeLabel,
  startOfWeekMonday,
} from "@/lib/constants";
import { isWallClockEnded } from "@/lib/zoned-time";
import {
  slotCoversGridRow,
  slotGridRowSpan,
  WEEK_DAYS,
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

export type DayPickerChip = {
  dateKey: string;
  weekStart: string;
  dayOfWeek: number;
  weekdayLabel: string;
  dayNumber: string;
};

/** Horizontal day-strip chips: a few weeks around today, expanded to include active week. */
export function buildDayPickerChips(
  activeWeekStart: string,
  weeksBefore = 2,
  weeksAfter = 6,
  today: Date = new Date(),
): DayPickerChip[] {
  const todayMonday = startOfWeekMonday(today);
  const activeMonday = parseDateOnly(activeWeekStart);
  let rangeStart = addDays(todayMonday, -weeksBefore * 7);
  let rangeEndExclusive = addDays(todayMonday, weeksAfter * 7);

  if (activeMonday.getTime() < rangeStart.getTime()) {
    rangeStart = addDays(activeMonday, -7);
  }
  if (activeMonday.getTime() >= rangeEndExclusive.getTime()) {
    rangeEndExclusive = addDays(activeMonday, 14);
  }

  const chips: DayPickerChip[] = [];
  for (
    let cursor = new Date(rangeStart);
    cursor.getTime() < rangeEndExclusive.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const dayOfWeek = cursor.getDay();
    const weekStart = formatDate(startOfWeekMonday(cursor));
    const meta = WEEK_DAYS.find((day) => day.value === dayOfWeek);
    chips.push({
      dateKey: formatDate(cursor),
      weekStart,
      dayOfWeek,
      weekdayLabel: meta?.label ?? cursor.toLocaleDateString("en-GB", { weekday: "short" }),
      dayNumber: String(cursor.getDate()),
    });
  }
  return chips;
}

export function isCalendarDatePast(dateKey: string, today: Date = new Date()): boolean {
  const day = parseDateOnly(dateKey);
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return day.getTime() < startToday.getTime();
}

export function isCalendarDateToday(dateKey: string, today: Date = new Date()): boolean {
  return dateKey === formatDate(today);
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

/**
 * True when a grid row is in the past: whole past days, or today's rows
 * whose window has already ended.
 */
export function isPastWeekRowTime(
  weekStart: string,
  dayOfWeek: number,
  rowTime: string,
  now: Date = new Date(),
  rowMinutes = SCHEDULE_DISPLAY_STEP_MINUTES,
): boolean {
  if (isPastWeekDay(weekStart, dayOfWeek, now)) return true;
  if (!isTodayWeekDay(weekStart, dayOfWeek, now)) return false;
  const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
  const rowEnd = parseTimeOnDate(
    dateKey,
    addMinutesToTime(rowTime, rowMinutes),
  );
  return rowEnd.getTime() <= now.getTime();
}

/** True when a schedule entry has already ended. */
export function isPastScheduleEntry(
  entry: Pick<ScheduleEntry, "endAt">,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  return isWallClockEnded(entry.endAt, timeZone, now);
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

export function bookedSlotColorClasses(onPastDay = false) {
  if (onPastDay) {
    return "border border-sky-200/70 bg-sky-100/55 text-sky-900/70";
  }

  return "border border-sky-200 bg-sky-100 text-sky-900 active:bg-sky-50";
}

export function bookedSlotSubtextClasses(_recurring: boolean, onPastDay = false) {
  if (onPastDay) {
    return "text-sky-800/55";
  }

  return "text-sky-700";
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
        "border-purple-200/70 bg-purple-100/55 text-purple-900/70",
        selected && "ring-2 ring-purple-300/80",
      );
    }
    if (hasMatch) {
      return cn(
        "border-green-500/90 bg-green-100/40",
        selected && "border-green-600/90 bg-green-100/55 ring-2 ring-green-400/80",
      );
    }
    return cn(
      "border-green-300/80 bg-green-100/40",
      selected && "border-green-400/90 bg-green-100/55 ring-2 ring-green-300/80",
    );
  }

  if (isHeld) {
    return cn(
      "border-purple-200 bg-purple-100 text-purple-900 active:bg-purple-50",
      selected && "ring-2 ring-purple-300",
    );
  }
  if (hasMatch) {
    return cn(
      "border-green-500 bg-green-50 active:border-green-600 active:bg-green-100",
      selected && "border-green-600 bg-green-100 ring-2 ring-green-400",
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

  if (onPastDay) {
    if (isHeld) {
      return line === "primary" ? "text-purple-900/70" : "text-purple-800/55";
    }
    return line === "primary" ? "text-green-900" : "text-green-700";
  }

  if (isHeld) {
    return line === "primary" ? "text-purple-900" : "text-purple-700";
  }
  return line === "primary" ? "text-green-800" : "text-green-600";
}
