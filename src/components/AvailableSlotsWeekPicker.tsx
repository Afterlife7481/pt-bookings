"use client";

import { useMemo, useState } from "react";
import {
  dayNumberForWeekDay,
  dateForWeekDay,
  isPastWeekDay,
  isTodayWeekDay,
} from "@/components/schedule/schedule-utils";
import { TimedSlotOverlay } from "@/components/schedule/TimedSlotOverlay";
import {
  WeeklyHourGrid,
} from "@/components/WeeklyHourGrid";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  SESSION_DURATION_MINUTES,
  defaultSlotEndTime,
  formatDate,
  formatMinutesAsTime,
  formatSlotLabel,
  localTodayDateKey,
  parseDateOnly,
  parseTimeToMinutes,
  slotTimeLabel,
  startOfWeekMonday,
} from "@/lib/constants";
import { timeRowsInScheduleRange } from "@/lib/schedule-grid";
import { shiftWeekStart } from "@/lib/schedule-utils";
import { cn, formatTimeOnly } from "@/lib/utils";

export type AvailablePickerSlot = {
  id: string;
  startAt: string;
  locationName: string | null;
  locationAddress?: string | null;
};

function dateKeyFromStartAt(startAt: string): string {
  return startAt.split("T")[0] ?? "";
}

function weekStartFromDateKey(dateKey: string): string {
  return formatDate(startOfWeekMonday(parseDateOnly(dateKey)));
}

function resolveScheduleRange(slots: AvailablePickerSlot[]): {
  startTime: string;
  endTime: string;
} {
  let startMin = parseTimeToMinutes(DEFAULT_SCHEDULE_START);
  let endMin = parseTimeToMinutes(DEFAULT_SCHEDULE_END);

  for (const slot of slots) {
    const slotStart = parseTimeToMinutes(slotTimeLabel(slot.startAt));
    const slotEnd = slotStart + SESSION_DURATION_MINUTES;
    startMin = Math.min(startMin, Math.floor(slotStart / 60) * 60);
    endMin = Math.max(endMin, Math.ceil(slotEnd / 60) * 60);
  }

  return {
    startTime: formatMinutesAsTime(Math.max(0, startMin)),
    endTime: formatMinutesAsTime(Math.min(24 * 60, endMin)),
  };
}

function weekLabel(weekStart: string): string {
  const monday = parseDateOnly(weekStart);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startLabel = monday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endLabel = sunday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  return `${startLabel} – ${endLabel}`;
}

export function AvailableSlotsWeekPicker({
  slots,
  selectedSlotId,
  onSelect,
  disabled = false,
  busy = false,
  scheduleStartTime: scheduleStartProp,
  scheduleEndTime: scheduleEndProp,
}: {
  slots: AvailablePickerSlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
  disabled?: boolean;
  busy?: boolean;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
}) {
  const derivedRange = useMemo(() => resolveScheduleRange(slots), [slots]);
  const scheduleStartTime = scheduleStartProp ?? derivedRange.startTime;
  const scheduleEndTime = scheduleEndProp ?? derivedRange.endTime;

  const weekBounds = useMemo(() => {
    if (slots.length === 0) {
      const current = formatDate(
        startOfWeekMonday(parseDateOnly(localTodayDateKey())),
      );
      return { min: current, max: current };
    }
    const weekStarts = slots.map((slot) =>
      weekStartFromDateKey(dateKeyFromStartAt(slot.startAt)),
    );
    weekStarts.sort();
    return { min: weekStarts[0]!, max: weekStarts[weekStarts.length - 1]! };
  }, [slots]);

  const [weekStart, setWeekStart] = useState(() => {
    const todayWeek = formatDate(
      startOfWeekMonday(parseDateOnly(localTodayDateKey())),
    );
    if (slots.some((s) => weekStartFromDateKey(dateKeyFromStartAt(s.startAt)) === todayWeek)) {
      return todayWeek;
    }
    return weekBounds.min;
  });

  const timeRows = useMemo(
    () => timeRowsInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );

  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailablePickerSlot[]>();
    for (const slot of slots) {
      const dateKey = dateKeyFromStartAt(slot.startAt);
      if (weekStartFromDateKey(dateKey) !== weekStart) continue;
      const list = map.get(dateKey) ?? [];
      list.push(slot);
      map.set(dateKey, list);
    }
    return map;
  }, [slots, weekStart]);

  const weekSlotCount = useMemo(() => {
    let count = 0;
    for (const list of slotsByDay.values()) count += list.length;
    return count;
  }, [slotsByDay]);

  const canPrev = weekStart > weekBounds.min;
  const canNext = weekStart < weekBounds.max;

  const selected = selectedSlotId
    ? slots.find((s) => s.id === selectedSlotId) ?? null
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          disabled={!canPrev || disabled}
          onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))}
        >
          ← Prev
        </button>
        <p className="text-sm font-medium text-slate-900">{weekLabel(weekStart)}</p>
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          disabled={!canNext || disabled}
          onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))}
        >
          Next →
        </button>
      </div>

      {weekSlotCount === 0 ? (
        <p className="text-sm text-slate-500">No open slots this week.</p>
      ) : null}

      <WeeklyHourGrid
        timeRows={timeRows}
        variant="compact"
        className="rounded-lg border border-slate-200"
        splitDayHeaderRows
        getDayHeader={(day) => ({
          primary: dayNumberForWeekDay(weekStart, day.value),
          secondary: day.label,
        })}
        isPastDay={(dayOfWeek) => isPastWeekDay(weekStart, dayOfWeek)}
        isToday={(dayOfWeek) => isTodayWeekDay(weekStart, dayOfWeek)}
        renderCell={() => <div className="h-full" />}
        renderDayOverlay={(dayOfWeek) => {
          const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
          const daySlots = slotsByDay.get(dateKey) ?? [];
          if (daySlots.length === 0) return null;

          return (
            <TimedSlotOverlay
              scheduleStartTime={scheduleStartTime}
              scheduleEndTime={scheduleEndTime}
              items={daySlots.map((slot) => {
                const startTime = slotTimeLabel(slot.startAt);
                const endTime = defaultSlotEndTime(startTime);
                const isSelected = selectedSlotId === slot.id;
                return {
                  key: slot.id,
                  startTime,
                  endTime,
                  content: (
                    <button
                      type="button"
                      disabled={disabled}
                      title={
                        slot.locationName
                          ? `${formatTimeOnly(slot.startAt)} · ${slot.locationName}`
                          : formatTimeOnly(slot.startAt)
                      }
                      onClick={() => onSelect(slot.id)}
                      className={cn(
                        "flex h-full w-full flex-col items-center justify-center rounded-md border px-0.5 text-center transition",
                        isSelected
                          ? "border-brand bg-brand text-brand-foreground ring-2 ring-brand ring-offset-1"
                          : "border-emerald-200 bg-emerald-100 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50",
                        disabled && "opacity-60",
                      )}
                    >
                      <span className="truncate text-[9px] font-medium leading-tight tabular-nums">
                        {formatTimeOnly(slot.startAt)}
                      </span>
                      {slot.locationName ? (
                        <span
                          className={cn(
                            "w-full truncate text-[8px] leading-tight",
                            isSelected ? "text-white/80" : "text-emerald-800/80",
                          )}
                        >
                          {slot.locationName}
                        </span>
                      ) : null}
                    </button>
                  ),
                };
              })}
            />
          );
        }}
      />

      {busy && selected ? (
        <p className="text-sm text-slate-600">
          Moving to{" "}
          <span className="font-medium text-slate-900">
            {formatSlotLabel(selected.startAt)}
          </span>
          {selected.locationName ? ` · ${selected.locationName}` : null}…
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          Tap an open slot to move this session.
        </p>
      )}
    </div>
  );
}
