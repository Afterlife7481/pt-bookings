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
  buildDayPickerChips,
  dateForWeekDay,
  dayNumberForWeekDay,
  defaultSelectedDay,
  displayRowHasEntry,
  entriesForDate,
  entryEndTime,
  entryStartTime,
  isCalendarDatePast,
  isCalendarDateToday,
  isPastScheduleEntry,
  isPastWeekDay,
  isPastWeekRowTime,
  isTodayWeekDay,
} from "@/components/schedule/schedule-utils";
import { DayScheduleCarousel } from "@/components/schedule/DayScheduleCarousel";
import { WeekScheduleCarousel } from "@/components/schedule/WeekScheduleCarousel";
import { TimedSlotOverlay } from "@/components/schedule/TimedSlotOverlay";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE, formatDate } from "@/lib/constants";
import { shiftWeekStart } from "@/lib/schedule-utils";
import { useTrainerSettings } from "@/app/dashboard/hooks/useTrainerSettings";
import {
  scheduleGridTimeLabel,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import type { ScheduleEntry, ScheduleHoliday } from "@/lib/services/schedule";
import {
  buildHolidayScheduleIndex,
  type HolidayScheduleIndex,
} from "@/lib/holidays-utils";
import {
  scheduleGridContentHeight,
  useScheduleViewportHeight,
} from "@/components/schedule/useScheduleViewportHeight";

type ClientOption = ScheduleClientOption;
type LocationOption = ScheduleLocationOption;

function DayScheduleGrid({
  weekStart,
  selectedDay,
  timeRows,
  scheduleStartTime,
  scheduleEndTime,
  entries,
  holidayIndex,
  editable,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  viewportHeight,
  timeZone,
}: {
  weekStart: string;
  selectedDay: number;
  timeRows: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  entries: ScheduleEntry[];
  holidayIndex: HolidayScheduleIndex;
  editable: boolean;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, startTime: string) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  viewportHeight?: number;
  timeZone: string;
}) {
  const dateKey = formatDate(dateForWeekDay(weekStart, selectedDay));
  const fitViewport = viewportHeight != null;
  const isPastDay = isPastWeekDay(weekStart, selectedDay);
  const isToday = isTodayWeekDay(weekStart, selectedDay);
  const minRowRem = 2.75;
  const rowTemplate = fitViewport
    ? `repeat(${timeRows.length}, minmax(${minRowRem}rem, 1fr))`
    : `repeat(${timeRows.length}, ${minRowRem}rem)`;
  const effectiveHeight =
    fitViewport && viewportHeight != null
      ? scheduleGridContentHeight(viewportHeight, timeRows.length, minRowRem)
      : undefined;
  const dayEntries = entriesForDate(entries, dateKey);

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
      ) : null}
      {timeRows.map((rowTime, rowIndex) => {
        const gridRow = rowIndex + 1;
        const occupied = displayRowHasEntry(entries, dateKey, rowTime);
        const blockedByHoliday = holidayIndex.blockedSlotKeys.has(
          `${selectedDay}-${rowTime}`,
        );
        const pastRow =
          !isPastDay &&
          isToday &&
          isPastWeekRowTime(weekStart, selectedDay, rowTime);
        const canAdd =
          editable &&
          onRequestAdd &&
          !occupied &&
          !isPastDay &&
          !pastRow &&
          !blockedByHoliday;

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

            <div
              style={{ gridColumn: 2, gridRow }}
              className={cn(
                "relative z-[1] min-h-0 p-0.5",
                rowIndex > 0 && "border-t border-slate-100",
                pastRow && "past-day-hatch",
                !isPastDay && !pastRow && "bg-white",
              )}
            >
              {blockedByHoliday && !occupied ? (
                <div
                  aria-hidden
                  className="holiday-hatch h-full min-h-0 rounded-lg"
                  title="Time off"
                />
              ) : canAdd ? (
                <button
                  type="button"
                  onClick={() => onRequestAdd(selectedDay, rowTime)}
                  aria-label={`Add a slot at ${rowTime}`}
                  title={`Add a slot at ${rowTime}`}
                  className="flex h-full min-h-0 w-full items-center justify-center text-slate-300 transition hover:bg-slate-50/80 hover:text-slate-400 active:bg-slate-100"
                >
                  <span aria-hidden className="text-sm font-light leading-none">
                    +
                  </span>
                </button>
              ) : (
                <div className="h-full min-h-0" />
              )}
            </div>
          </Fragment>
        );
      })}
      <div
        style={{ gridColumn: 2, gridRow: `1 / span ${timeRows.length}` }}
        className="pointer-events-none relative z-[5] min-h-0"
      >
        <TimedSlotOverlay
          scheduleStartTime={scheduleStartTime}
          scheduleEndTime={scheduleEndTime}
          items={dayEntries.map((entry) => {
            const entryPast = isPastDay || isPastScheduleEntry(entry, timeZone);
            return {
              key: entry.slotId,
              startTime: entryStartTime(entry),
              endTime: entryEndTime(entry),
              content: (
                <div
                  className={cn(
                    "h-full min-h-0 p-0.5",
                    !isPastDay && entryPast && "past-day-hatch rounded-lg",
                  )}
                >
                  <ScheduleCell
                    entry={entry}
                    editable={editable}
                    onOpen={editable ? onOpenSlot : undefined}
                    selected={selectedOpenSlot?.slotId === entry.slotId}
                    mobile
                    onPastDay={entryPast}
                  />
                </div>
              ),
            };
          })}
        />
      </div>
      </div>
    </div>
  );
}
function DayPicker({
  weekStart,
  selectedDay,
  onSelectCalendarDay,
}: {
  weekStart: string;
  selectedDay: number;
  onSelectCalendarDay: (nextWeekStart: string, dayOfWeek: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedChipRef = useRef<HTMLButtonElement>(null);
  const chips = useMemo(() => buildDayPickerChips(weekStart), [weekStart]);
  const selectedDateKey = formatDate(dateForWeekDay(weekStart, selectedDay));

  useEffect(() => {
    const chip = selectedChipRef.current;
    const scroller = scrollerRef.current;
    if (!chip || !scroller) return;
    const chipLeft = chip.offsetLeft;
    const chipRight = chipLeft + chip.offsetWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    if (chipLeft < viewLeft || chipRight > viewRight) {
      chip.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedDateKey, chips]);

  return (
    <div
      ref={scrollerRef}
      className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Choose day"
    >
      <div className="flex w-max gap-1">
        {chips.map((chip) => {
          const isSelected = chip.dateKey === selectedDateKey;
          const isPast = isCalendarDatePast(chip.dateKey);
          const isToday = isCalendarDateToday(chip.dateKey);

          return (
            <button
              key={chip.dateKey}
              ref={isSelected ? selectedChipRef : undefined}
              type="button"
              onClick={() =>
                onSelectCalendarDay(chip.weekStart, chip.dayOfWeek)
              }
              className={cn(
                "flex w-11 shrink-0 flex-col items-center rounded-xl border px-1 py-2",
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : isPast
                    ? "past-day-hatch border-red-200 text-red-900 active:bg-red-50/70"
                    : isToday
                      ? "border-sky-400 bg-sky-50 text-slate-900 active:bg-sky-100"
                      : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
              )}
            >
              <span className="text-[10px] font-semibold">
                {chip.weekdayLabel}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  isSelected ? "text-slate-300" : "text-slate-500",
                )}
              >
                {chip.dayNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  weekStart,
  timeRows,
  scheduleStartTime,
  scheduleEndTime,
  entries,
  holidayIndex,
  editable,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  compact = false,
  viewportHeight,
  timeZone,
}: {
  weekStart: string;
  timeRows: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  entries: ScheduleEntry[];
  holidayIndex: HolidayScheduleIndex;
  editable: boolean;
  selectedOpenSlot: ScheduleEntry | null;
  timeZone: string;
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
        holidayIndex.unavailableDays.has(dayOfWeek)
      }
      isToday={(dayOfWeek) => isTodayWeekDay(weekStart, dayOfWeek)}
      isPastCell={(dayOfWeek, rowTime) =>
        isPastWeekRowTime(weekStart, dayOfWeek, rowTime)
      }
      getDayHeader={(day) => ({
        primary: dayNumberForWeekDay(weekStart, day.value),
        secondary: day.label.charAt(0),
      })}
      renderCell={(dayOfWeek, rowTime) => {
        const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
        const occupied = displayRowHasEntry(entries, dateKey, rowTime);
        const blockedByHoliday = holidayIndex.blockedSlotKeys.has(
          `${dayOfWeek}-${rowTime}`,
        );
        const pastRow = isPastWeekRowTime(weekStart, dayOfWeek, rowTime);
        const canAdd =
          editable && onRequestAdd && !pastRow && !blockedByHoliday && !occupied;

        if (blockedByHoliday && !occupied) {
          return (
            <div
              aria-hidden
              className="holiday-hatch h-full rounded"
              title="Time off"
            />
          );
        }

        if (canAdd) {
          return (
            <button
              type="button"
              onClick={() => onRequestAdd(dayOfWeek, rowTime)}
              aria-label={`Add a slot at ${rowTime}`}
              title={`Add a slot at ${rowTime}`}
              className="flex h-full w-full items-center justify-center text-slate-300 transition hover:bg-slate-50/80 hover:text-slate-400"
            >
              <span aria-hidden className="text-xs font-light leading-none">
                +
              </span>
            </button>
          );
        }

        return <div className="h-full" />;
      }}
      renderDayOverlay={(dayOfWeek) => {
        const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
        const dayEntries = entriesForDate(entries, dateKey);
        const pastDay = isPastWeekDay(weekStart, dayOfWeek);

        return (
          <TimedSlotOverlay
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
            items={dayEntries.map((entry) => {
              const entryPast = pastDay || isPastScheduleEntry(entry, timeZone);
              return {
                key: entry.slotId,
                startTime: entryStartTime(entry),
                endTime: entryEndTime(entry),
                content: (
                  <div
                    className={cn(
                      "h-full min-h-0",
                      denseCells ? "p-0" : "p-0.5",
                      !pastDay && entryPast && "past-day-hatch rounded-lg",
                    )}
                  >
                    <ScheduleCell
                      entry={entry}
                      editable={editable}
                      onOpen={editable ? onOpenSlot : undefined}
                      selected={selectedOpenSlot?.slotId === entry.slotId}
                      compact={denseCells}
                      onPastDay={entryPast}
                    />
                  </div>
                ),
              };
            })}
          />
        );
      }}
    />
  );
}

export function WeekScheduleCalendar({
  weekStart,
  entries,
  holidays = [],
  neighborWeeks,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  viewMode,
  lockHours = 1,
  clients = [],
  locations = [],
  onChangeWeek,
  onGoToWeek,
  onAddSlot,
  onRemoveSlot,
  onAllocateSlot,
  onUpdateSlotLocation,
  onRefresh,
}: {
  weekStart: string;
  entries: ScheduleEntry[];
  holidays?: ScheduleHoliday[];
  /** Prefetched adjacent weeks for instant week-view swipes. */
  neighborWeeks?: {
    prev: { entries: ScheduleEntry[]; holidays: ScheduleHoliday[] } | null;
    next: { entries: ScheduleEntry[]; holidays: ScheduleHoliday[] } | null;
  };
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  viewMode: ScheduleView;
  lockHours?: number;
  clients?: ClientOption[];
  locations?: LocationOption[];
  onChangeWeek?: (delta: number) => void;
  onGoToWeek?: (weekStart: string) => void;
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
  const { settings } = useTrainerSettings();
  const timeZone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const timeRows = useMemo(
    () => timeRowsInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );
  const holidayIndex = useMemo(
    () => buildHolidayScheduleIndex(weekStart, holidays, timeRows),
    [weekStart, holidays, timeRows],
  );
  const prevHolidayIndex = useMemo(
    () =>
      buildHolidayScheduleIndex(
        shiftWeekStart(weekStart, -1),
        neighborWeeks?.prev?.holidays ?? [],
        timeRows,
      ),
    [neighborWeeks?.prev?.holidays, timeRows, weekStart],
  );
  const nextHolidayIndex = useMemo(
    () =>
      buildHolidayScheduleIndex(
        shiftWeekStart(weekStart, 1),
        neighborWeeks?.next?.holidays ?? [],
        timeRows,
      ),
    [neighborWeeks?.next?.holidays, timeRows, weekStart],
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
  const onGoToWeekRef = useRef(onGoToWeek);
  selectedDayRef.current = selectedDay;
  weekStartRef.current = weekStart;
  onChangeWeekRef.current = onChangeWeek;
  onGoToWeekRef.current = onGoToWeek;

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

  function selectCalendarDay(nextWeekStart: string, dayOfWeek: number) {
    selectedDayRef.current = dayOfWeek;
    setSelectedDay(dayOfWeek);
    if (nextWeekStart === weekStartRef.current) return;
    pendingWeekDayRef.current = dayOfWeek;
    onGoToWeekRef.current?.(nextWeekStart);
  }

  useEffect(() => {
    setSelectedOpenSlot((prev) => {
      if (!prev) return null;
      return entries.find((e) => e.slotId === prev.slotId) ?? prev;
    });
  }, [entries]);

  async function handleOfferSent() {
    await onRefresh?.();
  }

  async function handleConfirmAdd(
    locationId: string,
    endTime: string,
    startTime: string,
    dayOfWeek: number,
  ) {
    if (!pendingAdd || !onAddSlot || busyKey) return;
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
              onSelectCalendarDay={selectCalendarDay}
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
                  scheduleStartTime={scheduleStartTime}
                  scheduleEndTime={scheduleEndTime}
                  entries={entries}
                  holidayIndex={holidayIndex}
                  editable={editable}
                  timeZone={timeZone}
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
          <WeekScheduleCarousel
            weekStart={weekStart}
            onChangeWeek={
              onChangeWeek
                ? (delta) => {
                    if (shiftingRef.current) return;
                    shiftingRef.current = true;
                    onChangeWeek(delta);
                  }
                : undefined
            }
            renderWeek={(slideWeekStart, offset) => {
              const slideEntries =
                offset === 0
                  ? entries
                  : offset === -1
                    ? (neighborWeeks?.prev?.entries ?? [])
                    : (neighborWeeks?.next?.entries ?? []);
              const slideHolidayIndex =
                offset === 0
                  ? holidayIndex
                  : offset === -1
                    ? prevHolidayIndex
                    : nextHolidayIndex;

              return (
                <WeekGrid
                  weekStart={slideWeekStart}
                  timeRows={timeRows}
                  scheduleStartTime={scheduleStartTime}
                  scheduleEndTime={scheduleEndTime}
                  entries={slideEntries}
                  holidayIndex={slideHolidayIndex}
                  timeZone={timeZone}
                  editable={editable && offset === 0}
                  selectedOpenSlot={offset === 0 ? selectedOpenSlot : null}
                  onRequestAdd={
                    offset === 0 && onAddSlot ? requestAdd : undefined
                  }
                  onOpenSlot={openSlotActions}
                  compact={useCompactWeekGrid}
                  viewportHeight={gridViewportHeight}
                />
              );
            }}
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
