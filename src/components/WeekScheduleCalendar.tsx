"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  ScheduleViewToggle,
  type ScheduleView,
} from "@/components/ScheduleViewToggle";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";
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
  buildScheduleGrid,
  dateForWeekDay,
  dayHeader,
  dayShortDate,
  defaultSelectedDay,
  isPastSlot,
} from "@/components/schedule/schedule-utils";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import {
  addDays,
  formatDate,
  parseDateOnly,
  hoursInScheduleRange,
} from "@/lib/constants";
import {
  WEEK_DAYS,
  dayHeaderInitial,
  formatScheduleHour,
} from "@/lib/schedule-grid";
import type { ScheduleEntry } from "@/lib/services/schedule";

type ClientOption = ScheduleClientOption;
type LocationOption = ScheduleLocationOption;

function DayPicker({
  weekStart,
  selectedDay,
  onSelectDay,
  hours,
  grid,
}: {
  weekStart: string;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  hours: number[];
  grid: Map<string, ScheduleEntry>;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {WEEK_DAYS.map((day) => {
        const isSelected = selectedDay === day.value;
        const dateKey = formatDate(dateForWeekDay(weekStart, day.value));
        const daySlots = hours.filter((h) => grid.has(`${dateKey}-${h}`)).length;

        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onSelectDay(day.value)}
            className={cn(
              "flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition",
              isSelected
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
            )}
          >
            <span className="text-xs font-semibold">{day.label}</span>
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

function MobileDaySchedule({
  weekStart,
  selectedDay,
  hours,
  grid,
  editable,
  busyKey,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  nowMs,
}: {
  weekStart: string;
  selectedDay: number;
  hours: number[];
  grid: Map<string, ScheduleEntry>;
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, hour: number) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  nowMs: number | null;
}) {
  const dateKey = formatDate(dateForWeekDay(weekStart, selectedDay));

  return (
    <div className="space-y-2">
      {hours.map((hour) => {
        const entry = grid.get(`${dateKey}-${hour}`);
        const addKey = `add-${selectedDay}-${hour}`;
        const canAdd =
          editable &&
          onRequestAdd &&
          !entry &&
          !isPastSlot(weekStart, selectedDay, hour, nowMs);

        return (
          <div key={hour} className="flex items-center gap-3">
            <div className="flex w-14 shrink-0 items-center justify-center text-sm tabular-nums text-slate-500">
              {formatScheduleHour(hour)}
            </div>
            <div className="min-w-0 flex-1">
              {entry ? (
                <ScheduleCell
                  entry={entry}
                  editable={
                    editable &&
                    !entry.booking &&
                    entry.status === "available"
                  }
                  onOpen={editable ? onOpenSlot : undefined}
                  selected={selectedOpenSlot?.slotId === entry.slotId}
                  mobile
                />
              ) : canAdd ? (
                <button
                  type="button"
                  disabled={!!busyKey}
                  onClick={() => onRequestAdd(selectedDay, hour)}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 transition active:border-slate-400 active:bg-slate-50",
                    busyKey === addKey && "opacity-50",
                  )}
                >
                  + Add slot
                </button>
              ) : (
                <div className="min-h-12 rounded-lg bg-slate-50" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({
  weekStart,
  hours,
  grid,
  editable,
  busyKey,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  compact = false,
  nowMs,
}: {
  weekStart: string;
  hours: number[];
  grid: Map<string, ScheduleEntry>;
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, hour: number) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  compact?: boolean;
  nowMs: number | null;
}) {
  const rowHeight = compact ? "h-10" : "h-11";

  return (
    <WeeklyHourGrid
      hours={hours}
      variant={compact ? "compact" : "full"}
      wide={!compact}
      getDayHeader={(day) =>
        compact
          ? dayHeaderInitial(day)
          : {
              primary: day.label,
              secondary: dayHeader(weekStart, day.value).replace(/^\w+\s/, ""),
            }
      }
      renderCell={(dayOfWeek, hour) => {
        const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
        const entry = grid.get(`${dateKey}-${hour}`);

        if (entry) {
          return (
            <ScheduleCell
              entry={entry}
              editable={
                editable && !entry.booking && entry.status === "available"
              }
              onOpen={editable ? onOpenSlot : undefined}
              selected={selectedOpenSlot?.slotId === entry.slotId}
              compact={compact}
            />
          );
        }

        if (
          editable &&
          onRequestAdd &&
          !isPastSlot(weekStart, dayOfWeek, hour, nowMs)
        ) {
          return (
            <button
              type="button"
              disabled={!!busyKey}
              onClick={() => onRequestAdd(dayOfWeek, hour)}
              title="Add slot"
              className={cn(
                rowHeight,
                "flex w-full items-center justify-center rounded border border-transparent bg-white transition",
                compact
                  ? "border-dashed border-slate-200 active:border-slate-300 active:bg-slate-50"
                  : "group hover:border-slate-300 hover:bg-slate-50",
                busyKey === `add-${dayOfWeek}-${hour}` && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "font-medium text-slate-400",
                  compact
                    ? "text-[10px]"
                    : "text-[9px] text-slate-300 opacity-0 transition group-hover:opacity-100",
                )}
              >
                {compact ? "+" : "+ Add"}
              </span>
            </button>
          );
        }

        return <div className={cn(rowHeight, "bg-white")} />;
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
  defaultView = "day",
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
  ) => Promise<void> | void;
  onRemoveSlot?: (slotId: string) => Promise<void> | void;
  onAllocateSlot?: (slotId: string, clientId: string) => Promise<void> | void;
  onUpdateSlotLocation?: (
    slotId: string,
    locationId: string,
  ) => Promise<void> | void;
  onRefresh?: () => void | Promise<void>;
}) {
  const grid = buildScheduleGrid(weekStart, entries);
  const hours = hoursInScheduleRange(scheduleStartTime, scheduleEndTime);
  const editable = !!(onAddSlot || onRemoveSlot || onAllocateSlot);
  const mounted = useMounted();
  const nowMs = mounted ? Date.now() : null;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedOpenSlot, setSelectedOpenSlot] = useState<ScheduleEntry | null>(null);
  const [pendingAdd, setPendingAdd] = useState<{
    dayOfWeek: number;
    hour: number;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<ScheduleView>(() => defaultView);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    setSelectedDay(defaultSelectedDay(weekStart));
  }, [weekStart, mounted]);

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

  async function handleConfirmAdd(locationId: string) {
    if (!pendingAdd || !onAddSlot || busyKey) return;
    const { dayOfWeek, hour } = pendingAdd;
    const key = `add-${dayOfWeek}-${hour}`;
    setBusyKey(key);
    try {
      await onAddSlot(dayOfWeek, formatScheduleHour(hour), locationId);
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

  function requestAdd(dayOfWeek: number, hour: number) {
    if (!onAddSlot || busyKey) return;
    setPendingAdd({ dayOfWeek, hour });
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
      <div className="mb-4 flex flex-col gap-3 sm:mb-3">
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
          <div className="flex flex-wrap items-center gap-2">
            {showApplyTemplate && (
              <Button
                variant="secondary"
                disabled={applyingTemplate}
                onClick={() => setApplyTemplateOpen(true)}
              >
                {applyingTemplate ? "Applying…" : "Apply template"}
              </Button>
            )}
            {editable && (
              <span className="text-xs text-slate-500">
                {viewMode === "day"
                  ? "Tap + to add slots · tap open slots to offer or allocate"
                  : useCompactWeekGrid
                    ? "Tap + to add · tap open slots to manage"
                    : "Click empty cells to add · click open slots to offer or allocate"}
              </span>
            )}
          </div>
        </div>
      </div>

      {viewMode === "day" ? (
        <div>
          <div className="mb-4">
            <DayPicker
              weekStart={weekStart}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              hours={hours}
              grid={grid}
            />
          </div>

          <p className="mb-3 text-sm font-medium text-slate-900">{selectedDayLabel}</p>

          <MobileDaySchedule
            weekStart={weekStart}
            selectedDay={selectedDay}
            hours={hours}
            grid={grid}
            editable={editable}
            busyKey={busyKey}
            selectedOpenSlot={selectedOpenSlot}
            onRequestAdd={onAddSlot ? requestAdd : undefined}
            onOpenSlot={openSlotActions}
            nowMs={nowMs}
          />
        </div>
      ) : (
        <WeekGrid
          weekStart={weekStart}
          hours={hours}
          grid={grid}
          editable={editable}
          busyKey={busyKey}
          selectedOpenSlot={selectedOpenSlot}
          onRequestAdd={onAddSlot ? requestAdd : undefined}
          onOpenSlot={openSlotActions}
          compact={useCompactWeekGrid}
          nowMs={nowMs}
        />
      )}

      <ScheduleLegend />

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
          hour={pendingAdd.hour}
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
