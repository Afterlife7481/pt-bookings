"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Button } from "@/components/ui";
import {
  ScheduleViewToggle,
  type ScheduleView,
} from "@/components/ScheduleViewToggle";
import { WeeklyHourGrid, WEEK_GRID_EDGE_CLASS } from "@/components/WeeklyHourGrid";
import { ScheduleCell } from "@/components/schedule/ScheduleCell";
import { ScheduleLegend } from "@/components/schedule/ScheduleLegend";
import {
  AddSlotModal,
  ApplyTemplateModal,
  OpenSlotModal,
  type ScheduleClientOption,
  type ScheduleLocationOption,
} from "@/components/schedule/ScheduleModals";
import {
  countEntriesForDate,
  dateForWeekDay,
  dayHeader,
  dayNumberForWeekDay,
  dayShortDate,
  defaultSelectedDay,
  entryRowSpan,
  findEntryForScheduleRow,
} from "@/components/schedule/schedule-utils";
import { cn } from "@/lib/utils";
import { addDays, formatDate, parseDateOnly } from "@/lib/constants";
import {
  WEEK_DAYS,
  scheduleGridTimeLabel,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import type { ScheduleEntry } from "@/lib/services/schedule";
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
  entries,
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
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, startTime: string) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  viewportHeight?: number;
}) {
  const dateKey = formatDate(dateForWeekDay(weekStart, selectedDay));
  const fitViewport = viewportHeight != null;
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
      className="flex min-h-0 w-full min-w-0 flex-col overflow-visible rounded-lg border border-slate-200"
      style={effectiveHeight != null ? { height: effectiveHeight } : undefined}
    >
      <div
        className={cn("grid min-h-0 w-full min-w-0", fitViewport && "flex-1")}
        style={{
          gridTemplateColumns: "3.25rem 1fr",
          gridTemplateRows: rowTemplate,
        }}
      >
      {timeRows.map((rowTime, rowIndex) => {
        const gridRow = rowIndex + 1;
        const match = findEntryForScheduleRow(entries, dateKey, rowTime);
        const addKey = `add-${selectedDay}-${rowTime}`;
        const canAdd = editable && onRequestAdd && !match;

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
                  "min-h-0 p-0.5",
                  rowIndex > 0 && "border-t border-slate-100",
                  match && match.isStart && "relative z-10",
                )}
              >
                {match ? (
                  <ScheduleCell
                    entry={match.entry}
                    editable={
                      editable &&
                      !match.entry.booking &&
                      match.entry.status === "available"
                    }
                    onOpen={editable ? onOpenSlot : undefined}
                    selected={selectedOpenSlot?.slotId === match.entry.slotId}
                    mobile
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
                  <div className="h-full min-h-0 rounded-lg bg-slate-50/80" />
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
  onSelectDay,
  entries,
}: {
  weekStart: string;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  entries: ScheduleEntry[];
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_DAYS.map((day) => {
        const isSelected = selectedDay === day.value;
        const dateKey = formatDate(dateForWeekDay(weekStart, day.value));
        const daySlots = countEntriesForDate(entries, dateKey);

        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onSelectDay(day.value)}
            className={cn(
              "flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 transition sm:px-2",
              isSelected
                ? "border-slate-900 bg-slate-900 text-white"
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
            {daySlots > 0 && (
              <span
                className={cn(
                  "mt-1 rounded-full px-1.5 text-[10px] font-medium",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {daySlots}
              </span>
            )}
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
                editable={
                  editable && !entry.booking && entry.status === "available"
                }
                onOpen={editable ? onOpenSlot : undefined}
                selected={selectedOpenSlot?.slotId === entry.slotId}
                compact={denseCells}
              />
            ),
          };
        }

        if (editable && onRequestAdd) {
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

        return <div className="h-full bg-white" />;
      }}
    />
  );
}

export function WeekScheduleCalendar({
  weekStart,
  entries,
  hasTemplate,
  onApplyTemplate,
  applyingTemplate,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  defaultView = "week",
  lockHours = 1,
  clients = [],
  locations = [],
  onAddSlot,
  onRemoveSlot,
  onAllocateSlot,
  onUpdateSlotLocation,
  onRefresh,
}: {
  weekStart: string;
  entries: ScheduleEntry[];
  hasTemplate: boolean;
  onApplyTemplate?: () => void | Promise<boolean>;
  applyingTemplate?: boolean;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  defaultView?: ScheduleView;
  lockHours?: number;
  clients?: ClientOption[];
  locations?: LocationOption[];
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
  const [viewMode, setViewMode] = useState<ScheduleView>(() => defaultView);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  const gridViewportHeight = useScheduleViewportHeight(gridRef, {
    enabled: true,
    legendRef,
    remeasureKey: `${viewMode}-${weekStart}-${entries.length}-${selectedDay}`,
  });

  useEffect(() => {
    setSelectedDay(defaultSelectedDay(weekStart));
  }, [weekStart]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompactScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
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
    if (entry.booking || entry.status !== "available") return;
    setSelectedOpenSlot(entry);
  }

  const bookedCount = entries.filter((e) => e.booking).length;
  const openCount = entries.filter((e) => !e.booking && e.status === "available").length;
  const showApplyTemplate = bookedCount === 0 && !!onApplyTemplate;

  const selectedDayLabel = dayHeader(weekStart, selectedDay);
  const useCompactWeekGrid = isCompactScreen && viewMode === "week";

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 px-4 sm:mb-3 sm:px-5">
        <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <span className="font-medium text-slate-900">
            {formatDate(parseDateOnly(weekStart))} —{" "}
            {formatDate(addDays(parseDateOnly(weekStart), 6))}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm">{bookedCount} booked</span>
            <span className="text-xs sm:text-sm">{openCount} open</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScheduleViewToggle value={viewMode} onChange={setViewMode} />
          {showApplyTemplate && (
            <Button
              variant="secondary"
              disabled={applyingTemplate}
              onClick={() => setApplyTemplateOpen(true)}
            >
              {applyingTemplate ? "Applying…" : "Apply template"}
            </Button>
          )}
        </div>
      </div>

      {viewMode === "day" ? (
        <div className="px-4 sm:px-5">
          <div className="mb-4">
            <DayPicker
              weekStart={weekStart}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              entries={entries}
            />
          </div>

          <p className="mb-3 text-sm font-medium text-slate-900">{selectedDayLabel}</p>

          <div ref={gridRef}>
            <DayScheduleGrid
              weekStart={weekStart}
              selectedDay={selectedDay}
              timeRows={timeRows}
              entries={entries}
              editable={editable}
              busyKey={busyKey}
              selectedOpenSlot={selectedOpenSlot}
              onRequestAdd={onAddSlot ? requestAdd : undefined}
              onOpenSlot={openSlotActions}
              viewportHeight={gridViewportHeight}
            />
          </div>
        </div>
      ) : (
        <div ref={gridRef}>
          <WeekGrid
            weekStart={weekStart}
            timeRows={timeRows}
            entries={entries}
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
              ? "Tap + to add slots · tap open slots to offer or allocate"
              : useCompactWeekGrid
                ? "Tap + to add · tap open slots to manage"
                : "Click empty cells to add · click open slots to offer or allocate"}
          </p>
        )}
        <ScheduleLegend />
      </div>

      {applyTemplateOpen && onApplyTemplate && (
        <ApplyTemplateModal
          hasTemplate={hasTemplate}
          applying={applyingTemplate ?? false}
          onApply={async () => {
            const result = await onApplyTemplate();
            if (result !== false) {
              setApplyTemplateOpen(false);
            }
          }}
          onClose={() => !applyingTemplate && setApplyTemplateOpen(false)}
        />
      )}

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

      {selectedOpenSlot && (
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
      )}
    </div>
  );
}
