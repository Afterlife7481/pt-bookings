"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { LocationSelect } from "@/components/LocationSelect";
import { SheetModal } from "@/components/SheetModal";
import { OpenSlotLastMinuteSection } from "@/components/OpenSlotLastMinuteSection";
import {
  assertValidScheduleSlotTimes,
  defaultSlotEndTime,
  formatDate,
  formatSlotLabel,
  isScheduleTimeAligned,
  SCHEDULE_TIME_INPUT_STEP_SECONDS,
  slotDurationMinutes,
} from "@/lib/constants";
import type { ScheduleEntry } from "@/lib/services/schedule-types";
import { hasActiveLastMinuteOffer } from "@/lib/services/schedule-types";
import { dateForWeekDay } from "./schedule-utils";

export type ScheduleClientOption = {
  id: string;
  name: string;
  enabledLocationIds: string[];
};
export type ScheduleLocationOption = { id: string; name: string };
export type ScheduleTemplateOption = { id: string; name: string };

export function AddSlotModal({
  weekStart,
  dayOfWeek,
  startTime,
  locations,
  onConfirm,
  onClose,
  busy,
}: {
  weekStart: string;
  dayOfWeek: number;
  startTime: string;
  locations: ScheduleLocationOption[];
  onConfirm: (locationId: string, endTime: string) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [endTime, setEndTime] = useState(defaultSlotEndTime(startTime));
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const slotDate = formatDate(dateForWeekDay(weekStart, dayOfWeek));
  const slotLabel = formatSlotLabel(`${slotDate}T${startTime}:00`, `${slotDate}T${endTime}:00`);

  useEffect(() => {
    setEndTime(defaultSlotEndTime(startTime));
    setError(null);
  }, [startTime]);

  const durationMinutes =
    startTime && endTime ? slotDurationMinutes(startTime, endTime) : null;
  const timesAligned =
    isScheduleTimeAligned(startTime) && isScheduleTimeAligned(endTime);
  const durationValid = durationMinutes != null && durationMinutes > 0 && timesAligned;

  function handleConfirm() {
    try {
      assertValidScheduleSlotTimes(startTime, endTime);
      setError(null);
      void onConfirm(locationId, endTime);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid times");
    }
  }

  return (
    <SheetModal
      title="Add open slot"
      subtitle={slotLabel}
      onClose={onClose}
      footer={
        <Button
          className="w-full py-3 sm:py-2"
          disabled={!locationId || !durationValid || busy}
          onClick={handleConfirm}
        >
          {busy ? "Adding…" : "Add slot"}
        </Button>
      }
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Start</span>
            <input
              type="time"
              step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={startTime}
              readOnly
              disabled
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">End</span>
            <input
              type="time"
              step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setError(null);
              }}
              disabled={busy}
              required
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          End time must use 30-minute steps (for example 10:00 or 10:30).
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={setLocationId}
          disabled={busy}
        />
      </div>
    </SheetModal>
  );
}

export function OpenSlotModal({
  entry,
  clients,
  locations,
  lockHours,
  onAllocate,
  onRemove,
  onUpdateLocation,
  onOfferSent,
  onClose,
  busy,
}: {
  entry: ScheduleEntry;
  clients: ScheduleClientOption[];
  locations: ScheduleLocationOption[];
  lockHours: number;
  onAllocate: (slotId: string, clientId: string) => Promise<void>;
  onRemove: (slotId: string) => Promise<void>;
  onUpdateLocation: (slotId: string, locationId: string) => Promise<void>;
  onOfferSent: () => void | Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [clientId, setClientId] = useState("");
  const [locationId, setLocationId] = useState(entry.location?.id ?? locations[0]?.id ?? "");

  useEffect(() => {
    setClientId("");
    setLocationId(entry.location?.id ?? locations[0]?.id ?? "");
  }, [entry.slotId, entry.location?.id, locations]);

  async function saveLocation(nextLocationId: string) {
    if (!nextLocationId || nextLocationId === entry.location?.id) return;
    await onUpdateLocation(entry.slotId, nextLocationId);
  }

  const offerActive = hasActiveLastMinuteOffer(entry.lastMinute);

  function clientCanUseSlotLocation(client: ScheduleClientOption): boolean {
    if (!locationId) return false;
    return client.enabledLocationIds.includes(locationId);
  }

  const eligibleClients = clients.filter(clientCanUseSlotLocation);

  useEffect(() => {
    if (!clientId || !locationId) return;
    const selected = clients.find((client) => client.id === clientId);
    if (selected && !selected.enabledLocationIds.includes(locationId)) {
      setClientId("");
    }
  }, [clientId, clients, locationId]);

  return (
    <SheetModal
      title="Open slot"
      subtitle={formatSlotLabel(entry.startAt, entry.endAt)}
      onClose={onClose}
      footer={
        <>
          {clients.length > 0 && (
            <Button
              className="w-full py-3 sm:py-2"
              disabled={
                !clientId ||
                !locationId ||
                busy ||
                !eligibleClients.some((client) => client.id === clientId)
              }
              onClick={() => onAllocate(entry.slotId, clientId)}
            >
              {busy ? "Saving…" : "Allocate to client"}
            </Button>
          )}
          <Button
            variant="danger"
            className="w-full py-3 sm:py-2"
            disabled={busy || offerActive}
            onClick={() => onRemove(entry.slotId)}
          >
            Remove slot
          </Button>
        </>
      }
    >
      {offerActive && (
        <p className="text-sm text-amber-800">
          This slot cannot be removed while a last-minute offer is active.
        </p>
      )}
      {entry.lastMinute && (
        <OpenSlotLastMinuteSection
          slotId={entry.slotId}
          slotStartAt={entry.startAt}
          lastMinute={entry.lastMinute}
          lockHours={lockHours}
          onOfferSent={onOfferSent}
        />
      )}

      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-900">Direct allocation</h3>
        <p className="mt-1 text-xs text-slate-500">
          Book any client immediately, without the last-minute offer flow.
        </p>
      </div>

      <div className="mt-3">
        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={async (next) => {
            setLocationId(next);
            if (next) await saveLocation(next);
          }}
          disabled={busy}
        />
      </div>

      {clients.length > 0 ? (
        <>
          {locationId && eligibleClients.length === 0 && (
            <p className="mt-4 text-sm text-amber-800">
              No clients have this location enabled. Enable it on a client&apos;s
              profile before allocating.
            </p>
          )}
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Client</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={busy || !locationId}
            >
              <option value="">-- Select client --</option>
              {clients.map((c) => {
                const eligible = clientCanUseSlotLocation(c);
                return (
                  <option key={c.id} value={c.id} disabled={!eligible}>
                    {c.name}
                    {!eligible
                      ? c.enabledLocationIds.length === 0
                        ? " (no locations enabled)"
                        : " (location not enabled)"
                      : ""}
                  </option>
                );
              })}
            </select>
          </label>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Add a client under the Clients tab before allocating this slot.
        </p>
      )}
    </SheetModal>
  );
}

export function ApplyTemplateModal({
  hasTemplate,
  onApply,
  onClose,
  applying,
}: {
  hasTemplate: boolean;
  onApply: () => void | Promise<boolean | void>;
  onClose: () => void;
  applying: boolean;
}) {
  return (
    <SheetModal
      title="Apply weekly template"
      subtitle="Adds any template slots not already on this week."
      onClose={onClose}
      footer={
        hasTemplate ? (
          <Button
            className="w-full py-3 sm:py-2"
            disabled={applying}
            onClick={() => void onApply()}
          >
            {applying ? "Applying…" : "Apply to this week"}
          </Button>
        ) : undefined
      }
    >
      {!hasTemplate ? (
        <p className="mt-4 text-sm text-slate-500">
          Create your weekly template under Settings before applying to the
          schedule.
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Open slots from your weekly template will be added for this week.
          Recurring client sessions are booked automatically where they match.
        </p>
      )}
    </SheetModal>
  );
}
