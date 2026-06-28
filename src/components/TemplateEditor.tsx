"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { TemplateWeekCalendar } from "@/components/TemplateWeekCalendar";

export type TemplateSlotView = {
  dayOfWeek: number;
  startTime: string;
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
  locationId: string;
  locationName: string;
};

function sortDraftSlots(slots: DraftSlot[]) {
  return [...slots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });
}

function templateLocationSummary(slots: TemplateSlotView[]) {
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
      locationId: slot.locationId ?? locations[0]?.id ?? "",
      locationName:
        slot.locationName ??
        locations.find((l) => l.id === slot.locationId)?.name ??
        "Unknown",
    })),
  );
}

function draftToPayload(slots: DraftSlot[]) {
  return slots.map(({ dayOfWeek, startTime, locationId }) => ({
    dayOfWeek,
    startTime,
    locationId,
  }));
}

export function TemplateEditorForm({
  initialName = "",
  initialSlots = [],
  locations,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialSlots?: DraftSlot[];
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  submitLabel: string;
  onSubmit: (name: string, slots: DraftSlot[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationSummary = useMemo(
    () => templateLocationSummary(draftSlots),
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
      await onSubmit(name.trim(), draftSlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Template name</span>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={saving}
        />
      </label>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900">
            {draftSlots.length} slot{draftSlots.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-slate-500">{locationSummary}</p>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Click <span className="font-medium text-slate-700">+</span> to add a slot,
          or click an open slot to change its location or remove it.
        </p>
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

export function TemplateCard({
  template,
  locations,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  onUpdated,
}: {
  template: TemplateView;
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const locationSummary = templateLocationSummary(template.slots);
  const viewSlots = useMemo(
    () => slotsToDraft(template.slots, locations),
    [template.slots, locations],
  );

  async function saveTemplate(name: string, slots: DraftSlot[]) {
    const res = await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slots: draftToPayload(slots) }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to update template");
    }
    setEditing(false);
    onUpdated();
  }

  if (editing) {
    return (
      <Card>
        <h3 className="font-semibold">Edit template</h3>
        <div className="mt-4">
          <TemplateEditorForm
            key={template.id}
            initialName={template.name}
            initialSlots={viewSlots}
            locations={locations}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
            submitLabel="Save changes"
            onSubmit={saveTemplate}
            onCancel={() => setEditing(false)}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{template.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {template.slots.length} slot{template.slots.length === 1 ? "" : "s"} ·{" "}
            {locationSummary}
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

export function CreateTemplateCard({
  locations,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  onCreated,
}: {
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  onCreated: () => void;
}) {
  const [formKey, setFormKey] = useState(0);

  async function createTemplate(name: string, slots: DraftSlot[]) {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slots: draftToPayload(slots) }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to create template");
    }
    setFormKey((key) => key + 1);
    onCreated();
  }

  return (
    <Card>
      <h2 className="font-semibold">Create weekly template</h2>
      <div className="mt-4">
        <TemplateEditorForm
          key={formKey}
          locations={locations}
          scheduleStartTime={scheduleStartTime}
          scheduleEndTime={scheduleEndTime}
          submitLabel="Save template"
          onSubmit={createTemplate}
        />
      </div>
    </Card>
  );
}

export { draftToPayload, slotsToDraft, templateLocationSummary };
