"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";
import {
  type ScheduleView,
} from "@/components/ScheduleViewToggle";
import { WeeklyHourGrid, WEEK_GRID_EDGE_CLASS } from "@/components/WeeklyHourGrid";
import { ScheduleCell } from "@/components/schedule/ScheduleCell";
import { ScheduleLegend } from "@/components/schedule/ScheduleLegend";
import { BookedSlotModal } from "@/components/schedule/BookedSlotModal";
import {
  AddSlotModal,
  OpenSlotModal,
  type ScheduleClientOption,
  type ScheduleLocationOption,
} from "@/components/schedule/ScheduleModals";
import {
  adjacentDaySelection,
  dateForWeekDay,
  dayNumberForWeekDay,
  dayShortDate,
  defaultSelectedDay,
  entryRowSpan,
  findEntryForScheduleRow,
  isPastWeekDay,
  isTodayWeekDay,
} from "@/components/schedule/schedule-utils";
import { DayScheduleCarousel } from "@/components/schedule/DayScheduleCarousel";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/constants";
import {
  WEEK_DAYS,
  scheduleGridTimeLabel,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import type { ScheduleEntry, ScheduleHoliday } from "@/lib/services/schedule";
import {
  dayOverlapsHoliday,
  slotTimeOverlapsHoliday,
} from "@/lib/holidays-utils";
import { defaultSlotEndTime } from "@/lib/constants";
import {
  scheduleGridContentHeight,
  useScheduleViewportHeight,
} from "@/components/schedule/useScheduleViewportHeight";

type ClientOption = ScheduleClientOption;
type LocationOption = ScheduleLocationOption;

type HolidayOption = ScheduleHoliday;

function DayScheduleGrid({
  weekStart,
  selectedDay,
  timeRows,
  entries,
  holidays,
  editable,
  busyKey,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  viewportHeight,
}: {
  weekStart: string;
  selectedDay: number;
  timeRows: string[];
  entries: ScheduleEntry[];
  holidays: HolidayOption[];
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, startTime: string) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  viewportHeight?: number;
}) {
  const dateKey = formatDate(dateForWeekDay(weekStart, selectedDay));
  const fitViewport = viewportHeight != null;
  const isPastDay = isPastWeekDay(weekStart, selectedDay);
  const isUnavailableDay =
    !isPastDay && !!dayOverlapsHoliday(weekStart, selectedDay, holidays);
  const minRowRem = 2.75;
  const rowTemplate = fitViewport
    ? `repeat(${timeRows.length}, minmax(${minRowRem}rem, 1fr))`
    : `repeat(${timeRows.length}, ${minRowRem}rem)`;
  const effectiveHeight =
    fitViewport && viewportHeight != null
      ? scheduleGridContentHeight(viewportHeight, timeRows.length, minRowRem)
      : undefined;

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200"
      style={effectiveHeight != null ? { height: effectiveHeight } : undefined}
    >
      <div
        className={cn("relative grid min-h-0 w-full min-w-0", fitViewport && "flex-1")}
        style={{
          gridTemplateColumns: "3.25rem 1fr",
          gridTemplateRows: rowTemplate,
        }}
      >
      {isPastDay ? (
        <div
          aria-hidden
          className="pointer-events-none past-day-hatch"
          style={{ gridColumn: 2, gridRow: `1 / span ${timeRows.length}` }}
        />
      ) : isUnavailableDay ? (
        <div
          aria-hidden
          className="pointer-events-none holiday-hatch"
          style={{ gridColumn: 2, gridRow: `1 / span ${timeRows.length}` }}
        />
      ) : null}
      {timeRows.map((rowTime, rowIndex) => {
        const gridRow = rowIndex + 1;
        const match = findEntryForScheduleRow(entries, dateKey, rowTime);
        const addKey = `add-${selectedDay}-${rowTime}`;
        const blockedByHoliday = slotTimeOverlapsHoliday(
          weekStart,
          selectedDay,
          rowTime,
          defaultSlotEndTime(rowTime),
          holidays,
        );
        const canAdd =
          editable && onRequestAdd && !match && !isPastDay && !blockedByHoliday;

        return (
          <Fragment key={rowTime}>
            <div
              style={{ gridColumn: 1, gridRow }}
              className={cn(
                "flex min-h-0 items-start justify-center border-r border-slate-200 bg-slate-50 pt-0.5 text-[10px] tabular-nums text-slate-500",
                rowIndex > 0 && "border-t border-slate-100",
              )}
            >
              {scheduleGridTimeLabel(rowTime, false)}
            </div>

            {match && !match.isStart ? null : (
              <div
                style={{
                  gridColumn: 2,
                  gridRow:
                    match && match.isStart
                      ? `${gridRow} / span ${entryRowSpan(match.entry)}`
                      : gridRow,
                }}
                className={cn(
                  "relative z-[1] min-h-0 p-0.5",
                  rowIndex > 0 && "border-t border-slate-100",
                  match && match.isStart && "relative z-10",
                  !isPastDay && "bg-white",
                )}
              >
                {match ? (
                  <ScheduleCell
                    entry={match.entry}
                    editable={editable}
                    onOpen={editable ? onOpenSlot : undefined}
                    selected={selectedOpenSlot?.slotId === match.entry.slotId}
                    mobile
                    onPastDay={isPastDay}
                  />
                ) : canAdd ? (
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onRequestAdd(selectedDay, rowTime)}
                    className={cn(
                      "flex h-full min-h-0 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 transition active:border-slate-400 active:bg-slate-50",
                      busyKey === addKey && "opacity-50",
                    )}
                  >
                    + Add slot
                  </button>
                ) : (
                  <div className="h-full min-h-0" />
                )}
              </div>
            )}
          </Fragment>
        );
      })}
      </div>
    </div>
  );
}
function DayPicker({
  weekStart,
  selectedDay,
  holidays,
  onSelectDay,
}: {
  weekStart: string;
  selectedDay: number;
  holidays: HolidayOption[];
  onSelectDay: (day: number) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_DAYS.map((day) => {
        const isSelected = selectedDay === day.value;
        const isPast = isPastWeekDay(weekStart, day.value);
        const isUnavailable =
          !isPast && !!dayOverlapsHoliday(weekStart, day.value, holidays);

        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onSelectDay(day.value)}
            className={cn(
              "flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 sm:px-2",
              isSelected
                ? "border-slate-900 bg-slate-900 text-white"
                : isPast
                  ? "past-day-hatch border-red-200 text-red-900 active:bg-red-50/70"
                  : isUnavailable
                    ? "holiday-hatch border-amber-200 text-amber-950 active:bg-amber-50/70"
                    : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
            )}
          >
            <span className="text-[10px] font-semibold sm:text-xs">{day.label}</span>
            <span
              className={cn(
                "text-[10px]",
                isSelected ? "text-slate-300" : "text-slate-400",
              )}
            >
              {dayShortDate(weekStart, day.value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({
  weekStart,
  timeRows,
  entries,
  holidays,
  editable,
  busyKey,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  compact = false,
  viewportHeight,
}: {
  weekStart: string;
  timeRows: string[];
  entries: ScheduleEntry[];
  holidays: HolidayOption[];
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, startTime: string) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  compact?: boolean;
  viewportHeight?: number;
}) {
  const denseCells = compact;

  return (
    <WeeklyHourGrid
      timeRows={timeRows}
      variant={compact ? "compact" : "full"}
      wide={!compact}
      viewportHeight={viewportHeight}
      compactRowSize={compact ? "2rem" : undefined}
      className={WEEK_GRID_EDGE_CLASS}
      splitDayHeaderRows
      isPastDay={(dayOfWeek) => isPastWeekDay(weekStart, dayOfWeek)}
      isUnavailableDay={(dayOfWeek) =>
        !isPastWeekDay(weekStart, dayOfWeek) &&
        !!dayOverlapsHoliday(weekStart, dayOfWeek, holidays)
      }
      isToday={(dayOfWeek) => isTodayWeekDay(weekStart, dayOfWeek)}
      getDayHeader={(day) => ({
        primary: dayNumberForWeekDay(weekStart, day.value),
        secondary: day.label.charAt(0),
      })}
      renderCell={(dayOfWeek, rowTime) => {
        const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
        const match = findEntryForScheduleRow(entries, dateKey, rowTime);

        if (match && !match.isStart) {
          return { covered: true };
        }

        const entry = match?.entry ?? null;

        if (entry) {
          return {
            rowSpan: entryRowSpan(entry),
            content: (
              <ScheduleCell
                entry={entry}
                editable={editable}
                onOpen={editable ? onOpenSlot : undefined}
                selected={selectedOpenSlot?.slotId === entry.slotId}
                compact={denseCells}
                onPastDay={isPastWeekDay(weekStart, dayOfWeek)}
              />
            ),
          };
        }

        if (editable && onRequestAdd) {
          const pastDay = isPastWeekDay(weekStart, dayOfWeek);
          const blockedByHoliday = slotTimeOverlapsHoliday(
            weekStart,
            dayOfWeek,
            rowTime,
            defaultSlotEndTime(rowTime),
            holidays,
          );
          if (!pastDay && !blockedByHoliday) {
            return (
              <button
                type="button"
                disabled={!!busyKey}
                onClick={() => onRequestAdd(dayOfWeek, rowTime)}
                title={`Add slot at ${rowTime}`}
                className={cn(
                  "flex h-full w-full items-center justify-center rounded border border-dashed border-slate-200 bg-white font-medium text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600",
                  compact ? "text-[10px]" : "text-[10px]",
                  busyKey === `add-${dayOfWeek}-${rowTime}` && "opacity-50",
                )}
              >
                {compact ? "+" : "+ Add"}
              </button>
            );
          }
        }

        return <div className="h-full" />;
      }}
    />
  );
}

export function WeekScheduleCalendar({
  weekStart,
  entries,
  holidays = [],
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  viewMode,
  lockHours = 1,
  clients = [],
  locations = [],
  onChangeWeek,
  onAddSlot,
  onRemoveSlot,
  onAllocateSlot,
  onUpdateSlotLocation,
  onRefresh,
}: {
  weekStart: string;
  entries: ScheduleEntry[];
  holidays?: ScheduleHoliday[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  viewMode: ScheduleView;
  lockHours?: number;
  clients?: ClientOption[];
  locations?: LocationOption[];
  onChangeWeek?: (delta: number) => void;
  onAddSlot?: (
    dayOfWeek: number,
    startTime: string,
    locationId: string,
    endTime?: string,
  ) => Promise<void> | void;
  onRemoveSlot?: (slotId: string) => Promise<void> | void;
  onAllocateSlot?: (slotId: string, clientId: string) => Promise<void> | void;
  onUpdateSlotLocation?: (
    slotId: string,
    locationId: string,
  ) => Promise<void> | void;
  onRefresh?: () => void | Promise<void>;
}) {
  const timeRows = useMemo(
    () => timeRowsInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );
  const editable = !!(onAddSlot || onRemoveSlot || onAllocateSlot);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedOpenSlot, setSelectedOpenSlot] = useState<ScheduleEntry | null>(null);
  const [pendingAdd, setPendingAdd] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const pendingWeekDayRef = useRef<number | null>(null);
  const shiftingRef = useRef(false);
  const selectedDayRef = useRef(selectedDay);
  const weekStartRef = useRef(weekStart);
  const onChangeWeekRef = useRef(onChangeWeek);
  selectedDayRef.current = selectedDay;
  weekStartRef.current = weekStart;
  onChangeWeekRef.current = onChangeWeek;

  const gridViewportHeight = useScheduleViewportHeight(gridRef, {
    enabled: true,
    legendRef,
    remeasureKey: `${viewMode}-${weekStart}-${entries.length}-${selectedDay}`,
  });

  useEffect(() => {
    shiftingRef.current = false;
    if (pendingWeekDayRef.current != null) {
      setSelectedDay(pendingWeekDayRef.current);
      pendingWeekDayRef.current = null;
      return;
    }
    setSelectedDay(defaultSelectedDay(weekStart));
  }, [weekStart]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompactScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const shiftSelectedDay = useCallback((delta: -1 | 1) => {
    // Ignore overlapping commits from a previous swipe flight.
    if (shiftingRef.current) return;

    const next = adjacentDaySelection(selectedDayRef.current, delta);
    if (next.weekDelta === 0) {
      setSelectedDay(next.dayOfWeek);
      selectedDayRef.current = next.dayOfWeek;
      return;
    }
    if (!onChangeWeekRef.current) {
      setSelectedDay(next.dayOfWeek);
      selectedDayRef.current = next.dayOfWeek;
      return;
    }

    shiftingRef.current = true;
    pendingWeekDayRef.current = next.dayOfWeek;
    selectedDayRef.current = next.dayOfWeek;
    setSelectedDay(next.dayOfWeek);
    onChangeWeekRef.current(next.weekDelta);
  }, []);

  useEffect(() => {
    setSelectedOpenSlot((prev) => {
      if (!prev) return null;
      return entries.find((e) => e.slotId === prev.slotId) ?? prev;
    });
  }, [entries]);

  async function handleOfferSent() {
    await onRefresh?.();
  }

  async function handleConfirmAdd(locationId: string, endTime: string) {
    if (!pendingAdd || !onAddSlot || busyKey) return;
    const { dayOfWeek, startTime } = pendingAdd;
    const key = `add-${dayOfWeek}-${startTime}`;
    setBusyKey(key);
    try {
      await onAddSlot(dayOfWeek, startTime, locationId, endTime);
      setPendingAdd(null);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateLocation(slotId: string, locationId: string) {
    if (!onUpdateSlotLocation || busyKey) return;
    setBusyKey(`location-${slotId}`);
    try {
      await onUpdateSlotLocation(slotId, locationId);
      const loc = locations.find((l) => l.id === locationId);
      setSelectedOpenSlot((prev) =>
        prev && prev.slotId === slotId
          ? {
              ...prev,
              location: loc ? { id: loc.id, name: loc.name } : null,
            }
          : prev,
      );
    } finally {
      setBusyKey(null);
    }
  }

  function requestAdd(dayOfWeek: number, startTime: string) {
    if (!onAddSlot || busyKey) return;
    setPendingAdd({ dayOfWeek, startTime });
  }

  async function handleRemove(slotId: string) {
    if (!onRemoveSlot || busyKey) return;
    setBusyKey(`remove-${slotId}`);
    try {
      await onRemoveSlot(slotId);
      setSelectedOpenSlot(null);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAllocate(slotId: string, clientId: string) {
    if (!onAllocateSlot || busyKey) return;
    setBusyKey(`allocate-${slotId}`);
    try {
      await onAllocateSlot(slotId, clientId);
      setSelectedOpenSlot(null);
    } finally {
      setBusyKey(null);
    }
  }

  function openSlotActions(entry: ScheduleEntry) {
    setSelectedOpenSlot(entry);
  }

  const useCompactWeekGrid = isCompactScreen && viewMode === "week";

  return (
    <div>
      {viewMode === "day" ? (
        <div className="px-4 sm:px-5">
          <div className="mb-4">
            <DayPicker
              weekStart={weekStart}
              selectedDay={selectedDay}
              holidays={holidays}
              onSelectDay={setSelectedDay}
            />
          </div>

          <div ref={gridRef}>
            <DayScheduleCarousel
              weekStart={weekStart}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onShiftDay={onChangeWeek ? shiftSelectedDay : undefined}
              className="mb-1"
              renderDay={(dayOfWeek) => (
                <DayScheduleGrid
                  weekStart={weekStart}
                  selectedDay={dayOfWeek}
                  timeRows={timeRows}
                  entries={entries}
                  holidays={holidays}
                  editable={editable}
                  busyKey={busyKey}
                  selectedOpenSlot={selectedOpenSlot}
                  onRequestAdd={onAddSlot ? requestAdd : undefined}
                  onOpenSlot={openSlotActions}
                  viewportHeight={gridViewportHeight}
                />
              )}
            />
          </div>
        </div>
      ) : (
        <div ref={gridRef}>
          <WeekGrid
            weekStart={weekStart}
            timeRows={timeRows}
            entries={entries}
            holidays={holidays}
            editable={editable}
            busyKey={busyKey}
            selectedOpenSlot={selectedOpenSlot}
            onRequestAdd={onAddSlot ? requestAdd : undefined}
            onOpenSlot={openSlotActions}
            compact={useCompactWeekGrid}
            viewportHeight={gridViewportHeight}
          />
        </div>
      )}

      <div
        ref={legendRef}
        className={cn(
          "border-t border-slate-100 px-4 pt-5 pb-5 sm:px-5",
          viewMode === "week" ? "mt-6" : "mt-4",
        )}
      >
        {editable && (
          <p className="mb-2 text-xs text-slate-500">
            {viewMode === "day"
              ? "Tap + to add slots · tap slots to manage"
              : useCompactWeekGrid
                ? "Tap + to add · tap slots to manage"
                : "Click empty cells to add · click slots to manage"}
          </p>
        )}
        <ScheduleLegend />
      </div>

      {pendingAdd && (
        <AddSlotModal
          weekStart={weekStart}
          dayOfWeek={pendingAdd.dayOfWeek}
          startTime={pendingAdd.startTime}
          locations={locations}
          onConfirm={handleConfirmAdd}
          onClose={() => !busyKey && setPendingAdd(null)}
          busy={!!busyKey}
        />
      )}

      {selectedOpenSlot?.booking ? (
        <BookedSlotModal
          entry={selectedOpenSlot}
          onClose={() => setSelectedOpenSlot(null)}
          onChanged={async () => {
            await onRefresh?.();
          }}
        />
      ) : null}

      {selectedOpenSlot && !selectedOpenSlot.booking ? (
        <OpenSlotModal
          entry={selectedOpenSlot}
          clients={clients}
          locations={locations}
          lockHours={lockHours}
          onAllocate={handleAllocate}
          onRemove={handleRemove}
          onUpdateLocation={handleUpdateLocation}
          onOfferSent={handleOfferSent}
          onClose={() => !busyKey && setSelectedOpenSlot(null)}
          busy={!!busyKey}
        />
      ) : null}
    </div>
  );
}
