"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  hoursInScheduleRange,
} from "@/lib/constants";
import {
  dayHeaderShort,
  dayOfWeekLabel,
  hourFromTime,
  hourToStartTime,
} from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";
import { LocationSelect } from "@/components/LocationSelect";
import { SheetModal } from "@/components/SheetModal";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";
import { Button } from "@/components/ui";

export type TemplateDraftSlot = {
  dayOfWeek: number;
  startTime: string;
  locationId: string;
  locationName: string;
};

type LocationOption = { id: string; name: string };

type PendingCell = {
  dayOfWeek: number;
  startTime: string;
  existing: TemplateDraftSlot | null;
};

function buildSlotMap(slots: TemplateDraftSlot[]) {
  const map = new Map<string, TemplateDraftSlot>();
  for (const slot of slots) {
    map.set(`${slot.dayOfWeek}-${hourFromTime(slot.startTime)}`, slot);
  }
  return map;
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
  onSave: (locationId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [locationId, setLocationId] = useState(
    pending.existing?.locationId ?? locations[0]?.id ?? "",
  );

  return (
    <SheetModal
      title={pending.existing ? "Template slot" : "Add template slot"}
      subtitle={`${dayOfWeekLabel(pending.dayOfWeek)} ${pending.startTime}`}
      onClose={onClose}
      footer={
        <>
          <Button
            className="w-full py-3 sm:py-2"
            disabled={!locationId}
            onClick={() => onSave(locationId)}
          >
            {pending.existing ? "Save location" : "Add slot"}
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
      <div className="mt-4">
        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={setLocationId}
          emptyMessage="Add a location under Settings before adding template slots."
        />
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
  const slotMap = useMemo(() => buildSlotMap(slots), [slots]);
  const hours = useMemo(
    () => hoursInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );
  const [pending, setPending] = useState<PendingCell | null>(null);

  if (hours.length === 0) {
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
          hours={hours}
          variant="compact"
          getDayHeader={dayHeaderShort}
          renderCell={() => (
            <div className="h-10 rounded border border-transparent bg-slate-50/40" />
          )}
        />
      </div>
    );
  }

  function upsertSlot(dayOfWeek: number, startTime: string, locationId: string) {
    if (!onSlotsChange || disabled) return;
    const locationName =
      locations.find((l) => l.id === locationId)?.name ?? "Unknown";
    const key = `${dayOfWeek}-${hourFromTime(startTime)}`;
    const next = slots.filter(
      (s) => `${s.dayOfWeek}-${hourFromTime(s.startTime)}` !== key,
    );
    onSlotsChange([
      ...next,
      { dayOfWeek, startTime, locationId, locationName },
    ]);
    setPending(null);
  }

  function removeSlot(dayOfWeek: number, startTime: string) {
    if (!onSlotsChange || disabled) return;
    const key = `${dayOfWeek}-${hourFromTime(startTime)}`;
    onSlotsChange(
      slots.filter(
        (s) => `${s.dayOfWeek}-${hourFromTime(s.startTime)}` !== key,
      ),
    );
    setPending(null);
  }

  function openCell(dayOfWeek: number, hour: number) {
    if (readOnly || disabled) return;
    const startTime = hourToStartTime(hour);
    const existing = slotMap.get(`${dayOfWeek}-${hour}`) ?? null;
    if (existing) {
      setPending({ dayOfWeek, startTime, existing });
      return;
    }
    if (locations.length === 0) return;
    setPending({ dayOfWeek, startTime, existing: null });
  }

  return (
    <>
      <WeeklyHourGrid
        hours={hours}
        variant="compact"
        getDayHeader={dayHeaderShort}
        renderCell={(dayOfWeek, hour) => {
          const slot = slotMap.get(`${dayOfWeek}-${hour}`) ?? null;
          const canInteract =
            !readOnly && !disabled && (slot || locations.length > 0);

          if (slot) {
            return (
              <button
                type="button"
                disabled={!canInteract}
                onClick={() => openCell(dayOfWeek, hour)}
                title={`${dayOfWeekLabel(dayOfWeek)} ${slot.startTime} · ${slot.locationName}`}
                className={cn(
                  "h-10 flex w-full flex-col items-center justify-center rounded border border-green-200 bg-green-50 px-0.5 py-0.5 text-center transition",
                  canInteract && "hover:border-green-300 hover:bg-green-100",
                  !canInteract && "cursor-default",
                )}
              >
                <span className="truncate px-0.5 text-[9px] font-medium leading-tight text-green-700">
                  {slot.locationName}
                </span>
              </button>
            );
          }

          if (canInteract) {
            return (
              <button
                type="button"
                onClick={() => openCell(dayOfWeek, hour)}
                title="Add slot"
                className="flex h-10 w-full items-center justify-center rounded border border-dashed border-slate-200 bg-white text-[10px] font-medium text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
              >
                +
              </button>
            );
          }

          return (
            <div className="h-10 rounded border border-transparent bg-slate-50/40" />
          );
        }}
      />

      {pending && (
        <TemplateSlotModal
          pending={pending}
          locations={locations}
          onSave={(locationId) =>
            upsertSlot(pending.dayOfWeek, pending.startTime, locationId)
          }
          onRemove={() => removeSlot(pending.dayOfWeek, pending.startTime)}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}
