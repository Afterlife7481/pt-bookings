"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  assertValidScheduleSlotTimes,
  defaultSlotEndTime,
  formatTimeRange,
  slotDurationMinutes,
  timeRangesOverlap,
} from "@/lib/constants";
import { cn, formatDurationMinutes } from "@/lib/utils";
import {
  DAY_OPTIONS,
  dayHeaderShort,
  dayOfWeekLabel,
  slotCoversGridRow,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import { SheetModal } from "@/components/SheetModal";
import { WeeklyHourGrid, WEEK_GRID_EDGE_CLASS } from "@/components/WeeklyHourGrid";
import { TimedSlotOverlay } from "@/components/schedule/TimedSlotOverlay";
import { TimeSelect5Min } from "@/components/TimeSelect5Min";
import { Button } from "@/components/ui";

export type TemplateDraftSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
};

type LocationOption = { id: string; name: string };

type PendingCell = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  existing: TemplateDraftSlot | null;
};

function slotKey(dayOfWeek: number, startTime: string) {
  return `${dayOfWeek}-${startTime}`;
}

function findOverlappingTemplateSlot(
  slots: TemplateDraftSlot[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  exclude: { dayOfWeek: number; startTime: string } | null,
): TemplateDraftSlot | null {
  return (
    slots.find((slot) => {
      if (
        exclude &&
        slot.dayOfWeek === exclude.dayOfWeek &&
        slot.startTime === exclude.startTime
      ) {
        return false;
      }
      if (slot.dayOfWeek !== dayOfWeek) return false;
      return timeRangesOverlap(
        startTime,
        endTime,
        slot.startTime,
        slot.endTime,
      );
    }) ?? null
  );
}

function TemplateSlotModal({
  pending,
  locations,
  slots,
  onSave,
  onRemove,
  onClose,
}: {
  pending: PendingCell;
  locations: LocationOption[];
  slots: TemplateDraftSlot[];
  onSave: (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    locationId: string,
  ) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(pending.dayOfWeek);
  const [startTime, setStartTime] = useState(pending.startTime);
  const [endTime, setEndTime] = useState(pending.endTime);
  const [locationId, setLocationId] = useState(
    pending.existing?.locationId ?? locations[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDayOfWeek(pending.dayOfWeek);
    setStartTime(pending.startTime);
    setEndTime(pending.endTime);
    setLocationId(pending.existing?.locationId ?? locations[0]?.id ?? "");
    setError(null);
  }, [pending, locations]);

  const duration =
    startTime && endTime ? slotDurationMinutes(startTime, endTime) : null;

  function handleSave() {
    try {
      assertValidScheduleSlotTimes(startTime, endTime);
      if (!locationId) {
        setError("Choose a location");
        return;
      }
      const overlap = findOverlappingTemplateSlot(
        slots,
        dayOfWeek,
        startTime,
        endTime,
        pending.existing
          ? {
              dayOfWeek: pending.existing.dayOfWeek,
              startTime: pending.existing.startTime,
            }
          : null,
      );
      if (overlap) {
        setError(
          `This overlaps another template slot (${formatTimeRange(overlap.startTime, overlap.endTime)}). Choose a different time.`,
        );
        return;
      }
      setError(null);
      onSave(dayOfWeek, startTime, endTime, locationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid times");
    }
  }

  return (
    <SheetModal
      title={pending.existing ? "Edit template slot" : "Add template slot"}
      subtitle={`${dayOfWeekLabel(dayOfWeek)} · plan start and end times`}
      onClose={onClose}
      footer={
        <>
          <Button
            className="w-full py-3 sm:py-2"
            disabled={!locationId}
            onClick={handleSave}
          >
            {pending.existing ? "Save slot" : "Add slot"}
          </Button>
          {pending.existing && (
            <Button
              variant="danger"
              className="w-full py-3 sm:py-2"
              onClick={onRemove}
            >
              Remove slot
            </Button>
          )}
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Day</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={dayOfWeek}
            onChange={(e) => {
              setDayOfWeek(Number(e.target.value));
              setError(null);
            }}
          >
            {DAY_OPTIONS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Start</span>
            <TimeSelect5Min
              aria-label="Start time"
              value={startTime}
              onChange={(next) => {
                setStartTime(next);
                if (!pending.existing) {
                  setEndTime(defaultSlotEndTime(next));
                }
                setError(null);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">End</span>
            <TimeSelect5Min
              aria-label="End time"
              value={endTime}
              onChange={(next) => {
                setEndTime(next);
                setError(null);
              }}
            />
          </label>
        </div>

        {duration != null && duration > 0 && (
          <p className="text-sm text-slate-600">
            Duration: {formatDurationMinutes(duration)}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Times use 5-minute steps (for example 14:15–15:05 for a 50-minute
          session).
        </p>

        <div className="space-y-2">
          <p className="text-sm text-slate-600">Location</p>
          {locations.length === 0 ? (
            <p className="text-sm text-slate-500">
              Add a location under Settings before adding template slots.
            </p>
          ) : (
            <ul className="space-y-2">
              {locations.map((loc) => {
                const selected = locationId === loc.id;
                return (
                  <li key={loc.id}>
                    <button
                      type="button"
                      onClick={() => setLocationId(loc.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition",
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{loc.name}</span>
                      {selected && (
                        <span className="shrink-0" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </SheetModal>
  );
}

export function TemplateWeekCalendar({
  slots,
  locations,
  scheduleStartTime = DEFAULT_SCHEDULE_START,
  scheduleEndTime = DEFAULT_SCHEDULE_END,
  onSlotsChange,
  readOnly = false,
  disabled = false,
}: {
  slots: TemplateDraftSlot[];
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  onSlotsChange?: (slots: TemplateDraftSlot[]) => void;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const timeRows = useMemo(
    () => timeRowsInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );
  const [pending, setPending] = useState<PendingCell | null>(null);

  if (timeRows.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
        No hours to show. In Settings, set a schedule end time that is after the
        start time (for example 07:00 to 19:00).
      </div>
    );
  }

  if (!readOnly && locations.length === 0) {
    return (
      <>
        <div className="px-4 sm:px-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            Add at least one training location under Settings before you can
            add template slots.
          </div>
        </div>
        <WeeklyHourGrid
          timeRows={timeRows}
          variant="compact"
          className={WEEK_GRID_EDGE_CLASS}
          getDayHeader={dayHeaderShort}
          renderCell={() => (
            <div className="h-full rounded border border-transparent bg-slate-50/40" />
          )}
        />
      </>
    );
  }

  function upsertSlot(
    dayOfWeek: number,
    previous: { dayOfWeek: number; startTime: string } | null,
    startTime: string,
    endTime: string,
    locationId: string,
  ) {
    if (!onSlotsChange || disabled) return;
    const locationName =
      locations.find((l) => l.id === locationId)?.name ?? "Unknown";
    const next = slots.filter((s) => {
      if (
        previous &&
        s.dayOfWeek === previous.dayOfWeek &&
        s.startTime === previous.startTime
      ) {
        return false;
      }
      return slotKey(s.dayOfWeek, s.startTime) !== slotKey(dayOfWeek, startTime);
    });
    onSlotsChange([
      ...next,
      { dayOfWeek, startTime, endTime, locationId, locationName },
    ]);
    setPending(null);
  }

  function removeSlot(dayOfWeek: number, startTime: string) {
    if (!onSlotsChange || disabled) return;
    onSlotsChange(
      slots.filter(
        (s) => !(s.dayOfWeek === dayOfWeek && s.startTime === startTime),
      ),
    );
    setPending(null);
  }

  function openCell(
    dayOfWeek: number,
    rowTime: string,
    existing: TemplateDraftSlot | null,
  ) {
    if (readOnly || disabled) return;
    const defaultStart = existing?.startTime ?? rowTime;
    const defaultEnd = existing?.endTime ?? defaultSlotEndTime(defaultStart);
    setPending({
      dayOfWeek: existing?.dayOfWeek ?? dayOfWeek,
      startTime: defaultStart,
      endTime: defaultEnd,
      existing,
    });
  }

  function slotAtRow(dayOfWeek: number, rowTime: string) {
    return (
      slots.find(
        (s) =>
          s.dayOfWeek === dayOfWeek &&
          slotCoversGridRow(s.startTime, s.endTime, rowTime),
      ) ?? null
    );
  }

  return (
    <>
      <WeeklyHourGrid
        timeRows={timeRows}
        variant="compact"
        className={WEEK_GRID_EDGE_CLASS}
        getDayHeader={dayHeaderShort}
        renderCell={(dayOfWeek, rowTime) => {
          const covering = slotAtRow(dayOfWeek, rowTime);
          const canAdd =
            !readOnly && !disabled && !covering && locations.length > 0;

          if (covering) {
            return <div className="h-full" />;
          }

          if (canAdd) {
            return (
              <button
                type="button"
                onClick={() => openCell(dayOfWeek, rowTime, null)}
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

          return (
            <div className="h-full rounded border border-transparent bg-slate-50/40" />
          );
        }}
        renderDayOverlay={(dayOfWeek) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);
          return (
            <TimedSlotOverlay
              scheduleStartTime={scheduleStartTime}
              scheduleEndTime={scheduleEndTime}
              items={daySlots.map((slot) => {
                const canInteract = !readOnly && !disabled;
                return {
                  key: slotKey(slot.dayOfWeek, slot.startTime),
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  content: (
                    <button
                      type="button"
                      disabled={!canInteract}
                      onClick={() =>
                        openCell(dayOfWeek, slot.startTime, slot)
                      }
                      title={`${dayOfWeekLabel(dayOfWeek)} ${formatTimeRange(slot.startTime, slot.endTime)} · ${slot.locationName}`}
                      className={cn(
                        "flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded border border-green-200 bg-green-50 px-1 py-1 text-center transition",
                        canInteract &&
                          "hover:border-green-300 hover:bg-green-100",
                        !canInteract && "cursor-default",
                      )}
                    >
                      <span className="w-full min-w-0 truncate px-0.5 text-[9px] font-medium leading-tight text-green-800">
                        {slot.locationName}
                      </span>
                    </button>
                  ),
                };
              })}
            />
          );
        }}
      />

      {pending && (
        <TemplateSlotModal
          pending={pending}
          locations={locations}
          slots={slots}
          onSave={(dayOfWeek, startTime, endTime, locationId) =>
            upsertSlot(
              dayOfWeek,
              pending.existing
                ? {
                    dayOfWeek: pending.existing.dayOfWeek,
                    startTime: pending.existing.startTime,
                  }
                : null,
              startTime,
              endTime,
              locationId,
            )
          }
          onRemove={() => {
            if (pending.existing) {
              removeSlot(pending.existing.dayOfWeek, pending.existing.startTime);
            }
          }}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}
