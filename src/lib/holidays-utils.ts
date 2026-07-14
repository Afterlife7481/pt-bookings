import {
  addDays,
  addMinutesToTime,
  formatDate,
  parseDateOnly,
  parseLocalDateTime,
  parseTimeOnDate,
  toLocalDateTimeString,
  SCHEDULE_DISPLAY_STEP_MINUTES,
} from "@/lib/constants";

export type HolidayPeriod = {
  startAt: string;
  endAt: string;
  label?: string | null;
};

export const HOLIDAY_TEMPLATE_CONFLICT_RECOMMENDATIONS = [
  "Review Settings → Time off and shorten or remove a holiday if you still plan to train then.",
  "Apply the template to a different week, or add slots manually once you are back.",
  "Adjust your weekly template if your regular away days change long term.",
] as const;

export function normalizeHolidayDateTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  throw new Error("Invalid date and time");
}

export function datetimeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const a0 = parseLocalDateTime(aStart).getTime();
  const a1 = parseLocalDateTime(aEnd).getTime();
  const b0 = parseLocalDateTime(bStart).getTime();
  const b1 = parseLocalDateTime(bEnd).getTime();
  return a0 < b1 && b0 < a1;
}

type ParsedHolidayRange = HolidayPeriod & {
  startMs: number;
  endMs: number;
  id?: string;
};

function parseHolidayRanges(
  holidays: (HolidayPeriod & { id?: string })[],
): ParsedHolidayRange[] {
  return holidays.map((holiday) => ({
    ...holiday,
    startMs: parseLocalDateTime(holiday.startAt).getTime(),
    endMs: parseLocalDateTime(holiday.endAt).getTime(),
  }));
}

function rangesOverlapMs(
  aStartMs: number,
  aEndMs: number,
  bStartMs: number,
  bEndMs: number,
): boolean {
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

export function findOverlappingHoliday(
  slotStart: string,
  slotEnd: string,
  holidays: HolidayPeriod[],
): HolidayPeriod | null {
  if (holidays.length === 0) return null;
  return findOverlappingHolidayParsed(
    parseLocalDateTime(slotStart).getTime(),
    parseLocalDateTime(slotEnd).getTime(),
    parseHolidayRanges(holidays),
  );
}

export function parseHolidayRangesForLookup(
  holidays: (HolidayPeriod & { id?: string })[],
): ParsedHolidayRange[] {
  return parseHolidayRanges(holidays);
}

export function findOverlappingHolidayParsedRecord(
  slotStartMs: number,
  slotEndMs: number,
  parsedHolidays: ParsedHolidayRange[],
): ParsedHolidayRange | null {
  for (const holiday of parsedHolidays) {
    if (
      rangesOverlapMs(
        slotStartMs,
        slotEndMs,
        holiday.startMs,
        holiday.endMs,
      )
    ) {
      return holiday;
    }
  }
  return null;
}

export function findOverlappingHolidayParsed(
  slotStartMs: number,
  slotEndMs: number,
  parsedHolidays: ParsedHolidayRange[],
): HolidayPeriod | null {
  for (const holiday of parsedHolidays) {
    if (
      rangesOverlapMs(
        slotStartMs,
        slotEndMs,
        holiday.startMs,
        holiday.endMs,
      )
    ) {
      return holiday;
    }
  }
  return null;
}

export function dayRangeForWeekDay(
  weekStart: string,
  dayOfWeek: number,
): { start: string; end: string } {
  const monday = parseDateOnly(weekStart);
  const offset = (dayOfWeek - monday.getDay() + 7) % 7;
  const day = addDays(monday, offset);
  return {
    start: `${formatDate(day)}T00:00:00`,
    end: `${formatDate(addDays(day, 1))}T00:00:00`,
  };
}

export function dayOverlapsHoliday(
  weekStart: string,
  dayOfWeek: number,
  holidays: HolidayPeriod[],
): HolidayPeriod | null {
  const { start, end } = dayRangeForWeekDay(weekStart, dayOfWeek);
  for (const holiday of holidays) {
    if (datetimeRangesOverlap(start, end, holiday.startAt, holiday.endAt)) {
      return holiday;
    }
  }
  return null;
}

export function slotTimeOverlapsHoliday(
  weekStart: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  holidays: HolidayPeriod[],
): HolidayPeriod | null {
  const monday = parseDateOnly(weekStart);
  const offset = (dayOfWeek - monday.getDay() + 7) % 7;
  const day = addDays(monday, offset);
  const slotStart = toLocalDateTimeString(
    parseTimeOnDate(formatDate(day), startTime),
  );
  const slotEnd = toLocalDateTimeString(
    parseTimeOnDate(formatDate(day), endTime),
  );
  return findOverlappingHoliday(slotStart, slotEnd, holidays);
}

export function formatHolidayDateTime(iso: string): string {
  const date = parseLocalDateTime(iso);
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHolidayRange(startAt: string, endAt: string): string {
  return `${formatHolidayDateTime(startAt)} → ${formatHolidayDateTime(endAt)}`;
}

export function holidayDisplayName(holiday: HolidayPeriod): string {
  const label = holiday.label?.trim();
  return label && label.length > 0 ? label : "Time off";
}

export type HolidayScheduleIndex = {
  /** Days fully covered by time off (entire 00:00–24:00). */
  unavailableDays: ReadonlySet<number>;
  /** Days with partial time off (some slots blocked, not the whole day). */
  partialHolidayDays: ReadonlySet<number>;
  blockedSlotKeys: ReadonlySet<string>;
};

const EMPTY_HOLIDAY_INDEX: HolidayScheduleIndex = {
  unavailableDays: new Set(),
  partialHolidayDays: new Set(),
  blockedSlotKeys: new Set(),
};

function holidayFullyCoversDay(
  holiday: ParsedHolidayRange,
  dayStartMs: number,
  dayEndMs: number,
): boolean {
  return holiday.startMs <= dayStartMs && holiday.endMs >= dayEndMs;
}

/** Precompute day/cell overlap once per week instead of on every grid render. */
export function buildHolidayScheduleIndex(
  weekStart: string,
  holidays: HolidayPeriod[],
  timeRows: string[],
): HolidayScheduleIndex {
  if (holidays.length === 0) return EMPTY_HOLIDAY_INDEX;

  const parsed = parseHolidayRanges(holidays);
  const unavailableDays = new Set<number>();
  const partialHolidayDays = new Set<number>();
  const blockedSlotKeys = new Set<string>();
  const monday = parseDateOnly(weekStart);

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const offset = (dayOfWeek - monday.getDay() + 7) % 7;
    const day = addDays(monday, offset);
    const dayStartMs = parseLocalDateTime(`${formatDate(day)}T00:00:00`).getTime();
    const dayEndMs = parseLocalDateTime(
      `${formatDate(addDays(day, 1))}T00:00:00`,
    ).getTime();

    const overlapping = parsed.filter((holiday) =>
      rangesOverlapMs(dayStartMs, dayEndMs, holiday.startMs, holiday.endMs),
    );
    if (overlapping.some((holiday) => holidayFullyCoversDay(holiday, dayStartMs, dayEndMs))) {
      unavailableDays.add(dayOfWeek);
    } else if (overlapping.length > 0) {
      partialHolidayDays.add(dayOfWeek);
    }

    for (const startTime of timeRows) {
      const slotStart = toLocalDateTimeString(
        parseTimeOnDate(formatDate(day), startTime),
      );
      const slotEnd = toLocalDateTimeString(
        parseTimeOnDate(
          formatDate(day),
          addMinutesToTime(startTime, SCHEDULE_DISPLAY_STEP_MINUTES),
        ),
      );
      const slotStartMs = parseLocalDateTime(slotStart).getTime();
      const slotEndMs = parseLocalDateTime(slotEnd).getTime();
      const blocked = parsed.some((holiday) =>
        rangesOverlapMs(slotStartMs, slotEndMs, holiday.startMs, holiday.endMs),
      );
      if (blocked) blockedSlotKeys.add(`${dayOfWeek}-${startTime}`);
    }
  }

  return { unavailableDays, partialHolidayDays, blockedSlotKeys };
}
