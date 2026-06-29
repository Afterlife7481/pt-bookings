"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { LocationSelect } from "@/components/LocationSelect";
import { SheetModal } from "@/components/SheetModal";
import { OpenSlotLastMinuteSection } from "@/components/OpenSlotLastMinuteSection";
import { formatDate, formatSlotLabel } from "@/lib/constants";
import { formatScheduleHour } from "@/lib/schedule-grid";
import type { ScheduleEntry } from "@/lib/services/schedule";
import { dateForWeekDay } from "./schedule-utils";

export type ScheduleClientOption = { id: string; name: string };
export type ScheduleLocationOption = { id: string; name: string };
export type ScheduleTemplateOption = { id: string; name: string };

export function AddSlotModal({
  weekStart,
  dayOfWeek,
  hour,
  locations,
  onConfirm,
  onClose,
  busy,
}: {
  weekStart: string;
  dayOfWeek: number;
  hour: number;
  locations: ScheduleLocationOption[];
  onConfirm: (locationId: string) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const slotLabel = formatSlotLabel(
    `${formatDate(dateForWeekDay(weekStart, dayOfWeek))}T${formatScheduleHour(hour)}:00`,
  );

  return (
    <SheetModal
      title="Add open slot"
      subtitle={slotLabel}
      onClose={onClose}
      footer={
        <>
          <Button
            className="w-full py-3 sm:py-2"
            disabled={!locationId || busy}
            onClick={() => onConfirm(locationId)}
          >
            {busy ? "Adding…" : "Add slot"}
          </Button>
          <Button variant="secondary" className="w-full py-3 sm:py-2" disabled={busy} onClick={onClose}>
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

  return (
    <SheetModal
      title="Open slot"
      subtitle={formatSlotLabel(entry.startAt)}
      onClose={onClose}
      footer={
        <>
          {clients.length > 0 && (
            <Button
              className="w-full py-3 sm:py-2"
              disabled={!clientId || !locationId || busy}
              onClick={() => onAllocate(entry.slotId, clientId)}
            >
              {busy ? "Saving…" : "Allocate to client"}
            </Button>
          )}
          <Button
            variant="danger"
            className="w-full py-3 sm:py-2"
            disabled={busy}
            onClick={() => onRemove(entry.slotId)}
          >
            Remove slot
          </Button>
          <Button variant="secondary" className="w-full py-3 sm:py-2" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {entry.lastMinute && (
        <OpenSlotLastMinuteSection
          slotId={entry.slotId}
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
        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Client</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={busy}
          >
            <option value="">-- Select client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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
        <>
          {hasTemplate && (
            <Button
              className="w-full py-3 sm:py-2"
              disabled={applying}
              onClick={() => void onApply()}
            >
              {applying ? "Applying…" : "Apply to this week"}
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full py-3 sm:py-2"
            disabled={applying}
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
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
