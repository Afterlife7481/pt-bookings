"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  assertValidScheduleSlotTimes,
  defaultSlotEndTime,
  formatTimeRange,
  SCHEDULE_TIME_INPUT_STEP_SECONDS,
  slotDurationMinutes,
} from "@/lib/constants";
import { cn, formatDurationMinutes } from "@/lib/utils";
import {
  dayHeaderShort,
  dayOfWeekLabel,
  hourToStartTime,
  slotCoversGridRow,
  slotGridRowSpan,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import { LocationSelect } from "@/components/LocationSelect";
import { SheetModal } from "@/components/SheetModal";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";
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

function TemplateSlotModal({
  pending,
  locations,
  onSave,
  onRemove,
  onClose,
}: {
  pending: PendingCell;
  locations: LocationOption[];
  onSave: (startTime: string, endTime: string, locationId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(pending.startTime);
  const [endTime, setEndTime] = useState(pending.endTime);
  const [locationId, setLocationId] = useState(
    pending.existing?.locationId ?? locations[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartTime(pending.startTime);
    setEndTime(pending.endTime);
    setLocationId(pending.existing?.locationId ?? locations[0]?.id ?? "");
    setError(null);
  }, [pending, locations]);

  const duration =
    startTime && endTime
      ? slotDurationMinutes(startTime, endTime)
      : null;

  function handleSave() {
    try {
      assertValidScheduleSlotTimes(startTime, endTime);
      if (!locationId) {
        setError("Choose a location");
        return;
      }
      setError(null);
      onSave(startTime, endTime, locationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid times");
    }
  }

  return (
    <SheetModal
      title={pending.existing ? "Edit template slot" : "Add template slot"}
      subtitle={`${dayOfWeekLabel(pending.dayOfWeek)} · plan start and end times`}
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
          <Button variant="secondary" className="w-full py-3 sm:py-2" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Start</span>
            <input
              type="time"
              step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">End</span>
            <input
              type="time"
              step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>
        </div>

        {duration != null && duration > 0 && (
          <p className="text-sm text-slate-600">
            Duration: {formatDurationMinutes(duration)}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Times must be in 30-minute steps (for example 09:00, 09:30, 10:00).
        </p>

        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={setLocationId}
          emptyMessage="Add a location under Settings before adding template slots."
        />

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
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          Add at least one training location under Settings to enable the +
          buttons on this calendar.
        </div>
        <WeeklyHourGrid
          timeRows={timeRows}
          variant="compact"
          getDayHeader={dayHeaderShort}
          renderCell={() => (
            <div className="h-full rounded border border-transparent bg-slate-50/40" />
          )}
        />
      </div>
    );
  }

  function upsertSlot(
    dayOfWeek: number,
    previousStartTime: string | null,
    startTime: string,
    endTime: string,
    locationId: string,
  ) {
    if (!onSlotsChange || disabled) return;
    const locationName =
      locations.find((l) => l.id === locationId)?.name ?? "Unknown";
    const next = slots.filter((s) => {
      if (previousStartTime && s.dayOfWeek === dayOfWeek && s.startTime === previousStartTime) {
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
      dayOfWeek,
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
        getDayHeader={dayHeaderShort}
        renderCell={(dayOfWeek, rowTime) => {
          const covering = slotAtRow(dayOfWeek, rowTime);
          if (covering && covering.startTime !== rowTime) {
            return { covered: true };
          }

          const slot = covering;
          const canInteract =
            !readOnly && !disabled && (slot || locations.length > 0);

          if (slot) {
            const rowSpan = slotGridRowSpan(slot.startTime, slot.endTime);
            return {
              rowSpan,
              content: (
                <button
                  type="button"
                  disabled={!canInteract}
                  onClick={() => openCell(dayOfWeek, rowTime, slot)}
                  title={`${dayOfWeekLabel(dayOfWeek)} ${formatTimeRange(slot.startTime, slot.endTime)} · ${slot.locationName}`}
                  className={cn(
                    "flex h-full min-h-0 w-full flex-col items-center justify-center rounded border border-green-200 bg-green-50 px-1 py-1 text-center transition",
                    canInteract && "hover:border-green-300 hover:bg-green-100",
                    !canInteract && "cursor-default",
                  )}
                >
                  <span className="block truncate px-0.5 text-[9px] font-medium leading-tight text-green-800">
                    {slot.locationName}
                  </span>
                </button>
              ),
            };
          }

          if (canInteract) {
            return (
              <button
                type="button"
                onClick={() => openCell(dayOfWeek, rowTime, null)}
                title={`Add slot at ${rowTime}`}
                className="flex h-full w-full items-center justify-center rounded border border-dashed border-slate-200 bg-white text-[10px] font-medium text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
              >
                +
              </button>
            );
          }

          return (
            <div className="h-full rounded border border-transparent bg-slate-50/40" />
          );
        }}
      />

      {pending && (
        <TemplateSlotModal
          pending={pending}
          locations={locations}
          onSave={(startTime, endTime, locationId) =>
            upsertSlot(
              pending.dayOfWeek,
              pending.existing?.startTime ?? null,
              startTime,
              endTime,
              locationId,
            )
          }
          onRemove={() => {
            if (pending.existing) {
              removeSlot(pending.dayOfWeek, pending.existing.startTime);
            }
          }}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}
