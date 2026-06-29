"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { TemplateWeekCalendar } from "@/components/TemplateWeekCalendar";
import { defaultSlotEndTime, slotDurationMinutes } from "@/lib/constants";

export type TemplateSlotView = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string | null;
  locationName: string | null;
};

export type TemplateView = {
  id: string;
  name: string;
  slots: TemplateSlotView[];
};

type LocationOption = { id: string; name: string };

export type DraftSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
};

function sortDraftSlots(slots: DraftSlot[]) {
  return [...slots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });
}

function templateLocationSummary(slots: TemplateSlotView[] | DraftSlot[]) {
  const names = [
    ...new Set(slots.map((s) => s.locationName).filter(Boolean)),
  ] as string[];
  return names.length > 0 ? names.join(", ") : "No locations set";
}

function slotsToDraft(slots: TemplateSlotView[], locations: LocationOption[]): DraftSlot[] {
  return sortDraftSlots(
    slots.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime ?? defaultSlotEndTime(slot.startTime),
      locationId: slot.locationId ?? locations[0]?.id ?? "",
      locationName:
        slot.locationName ??
        locations.find((l) => l.id === slot.locationId)?.name ??
        "Unknown",
    })),
  );
}

function draftToPayload(slots: DraftSlot[]) {
  return slots.map(({ dayOfWeek, startTime, endTime, locationId }) => ({
    dayOfWeek,
    startTime,
    endTime,
    locationId,
  }));
}

function averageDurationLabel(slots: DraftSlot[] | TemplateSlotView[]) {
  if (slots.length === 0) return null;
  const minutes = slots.map((s) =>
    slotDurationMinutes(s.startTime, s.endTime ?? defaultSlotEndTime(s.startTime)),
  );
  const avg = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
  if (avg % 60 === 0) return `${avg / 60}h sessions`;
  return `${avg} min avg`;
}

export function TemplateEditorForm({
  initialSlots = [],
  locations,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialSlots?: DraftSlot[];
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  submitLabel: string;
  onSubmit: (slots: DraftSlot[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationSummary = useMemo(
    () => templateLocationSummary(draftSlots),
    [draftSlots],
  );
  const durationSummary = useMemo(
    () => averageDurationLabel(draftSlots),
    [draftSlots],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (draftSlots.length === 0) {
      setError("Add at least one slot to the template");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(draftSlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900">
            {draftSlots.length} slot{draftSlots.length === 1 ? "" : "s"}
            {durationSummary ? ` · ${durationSummary}` : ""}
          </p>
          <p className="text-sm text-slate-500">{locationSummary}</p>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Click <span className="font-medium text-slate-700">+</span> to add a
          slot, then set its start time, end time, and location. Times must use
          30-minute steps (09:00, 09:30, 10:00, …).
        </p>
        {locations.length === 0 && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Add at least one location under Settings before you can add template
            slots. The calendar will stay blank until then.
          </p>
        )}
        <TemplateWeekCalendar
          slots={draftSlots}
          locations={locations}
          scheduleStartTime={scheduleStartTime}
          scheduleEndTime={scheduleEndTime}
          onSlotsChange={setDraftSlots}
          disabled={saving}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function WeeklyTemplatePanel({
  template,
  locations,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  onSaved,
}: {
  template: TemplateView | null;
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(!template);
  const viewSlots = useMemo(
    () => (template ? slotsToDraft(template.slots, locations) : []),
    [template, locations],
  );
  const locationSummary = template
    ? templateLocationSummary(template.slots)
    : "No locations set";
  const durationSummary = template ? averageDurationLabel(template.slots) : null;

  async function saveTemplate(slots: DraftSlot[]) {
    const res = await fetch("/api/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: draftToPayload(slots) }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to save template");
    }
    setEditing(false);
    onSaved();
  }

  if (editing || !template) {
    return (
      <Card>
        <h2 className="font-semibold">Weekly template</h2>
        <p className="mt-1 text-sm text-slate-600">
          Plan your typical week — each slot has its own start and end time, plus
          a location. Apply it from the Schedule tab to populate open weeks.
        </p>
        <div className="mt-4">
          <TemplateEditorForm
            key={template?.id ?? "new"}
            initialSlots={viewSlots}
            locations={locations}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
            submitLabel={template ? "Save changes" : "Save template"}
            onSubmit={saveTemplate}
            onCancel={template ? () => setEditing(false) : undefined}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Weekly template</h2>
          <p className="mt-1 text-sm text-slate-500">
            {template.slots.length} slot{template.slots.length === 1 ? "" : "s"}
            {durationSummary ? ` · ${durationSummary}` : ""} · {locationSummary}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      {template.slots.length > 0 ? (
        <div className="mt-4">
          <TemplateWeekCalendar
            slots={viewSlots}
            locations={locations}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
            readOnly
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No slots in this template.</p>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Apply this template from the Schedule tab, one week at a time.
      </p>
    </Card>
  );
}

export { draftToPayload, slotsToDraft, templateLocationSummary };
