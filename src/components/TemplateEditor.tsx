"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "@/components/ui";
import { TemplateWeekCalendar } from "@/components/TemplateWeekCalendar";
import { defaultSlotEndTime, slotDurationMinutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

function templateLocationSummary(
  slots: TemplateSlotView[] | DraftSlot[],
): string | null {
  const names = [
    ...new Set(slots.map((s) => s.locationName).filter(Boolean)),
  ] as string[];
  return names.length > 0 ? names.join(", ") : null;
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

function slotsSignature(slots: DraftSlot[]) {
  return JSON.stringify(
    sortDraftSlots(slots).map(({ dayOfWeek, startTime, endTime, locationId }) => ({
      dayOfWeek,
      startTime,
      endTime,
      locationId,
    })),
  );
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

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function TemplateEditorForm({
  initialSlots = [],
  locations,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  onSubmit,
}: {
  initialSlots?: DraftSlot[];
  locations: LocationOption[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  onSubmit: (slots: DraftSlot[]) => Promise<void>;
}) {
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>(initialSlots);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const draftSlotsRef = useRef(draftSlots);
  draftSlotsRef.current = draftSlots;
  const savedSignatureRef = useRef(slotsSignature(initialSlots));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const locationSummary = useMemo(
    () => templateLocationSummary(draftSlots),
    [draftSlots],
  );
  const durationSummary = useMemo(
    () => averageDurationLabel(draftSlots),
    [draftSlots],
  );

  useEffect(() => {
    const nextSig = slotsSignature(initialSlots);
    if (nextSig === savedSignatureRef.current) return;
    if (saveTimerRef.current) return;
    setDraftSlots(initialSlots);
    savedSignatureRef.current = nextSig;
  }, [initialSlots]);

  const persist = useCallback(async (slots: DraftSlot[]) => {
    if (slots.length === 0) {
      setError("Add at least one slot to the template");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setError(null);
    try {
      await onSubmitRef.current(slots);
      savedSignatureRef.current = slotsSignature(slots);
      setSaveStatus("saved");
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
      savedFadeTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
      setSaveStatus("error");
    }
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("pending");

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persist(draftSlotsRef.current);
    }, 600);
  }, [persist]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (savedFadeTimerRef.current) {
        clearTimeout(savedFadeTimerRef.current);
      }

      const slots = draftSlotsRef.current;
      if (slotsSignature(slots) === savedSignatureRef.current) return;
      if (slots.length === 0) return;

      void fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: draftToPayload(slots) }),
        keepalive: true,
      });
    };
  }, []);

  function handleSlotsChange(next: DraftSlot[]) {
    setDraftSlots(next);
    draftSlotsRef.current = next;
    if (slotsSignature(next) === savedSignatureRef.current) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setSaveStatus("idle");
      setError(null);
      return;
    }
    scheduleAutoSave();
  }

  const statusMessage =
    saveStatus === "pending" || saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : null;

  return (
    <div className="space-y-0">
      <div className="space-y-4 px-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-sm font-medium text-slate-900">
            {draftSlots.length} slot{draftSlots.length === 1 ? "" : "s"}
            {durationSummary ? ` · ${durationSummary}` : ""}
          </p>
          <div className="flex min-w-0 items-center gap-3">
            {locationSummary && (
              <p className="min-w-0 max-w-[min(100%,12rem)] truncate text-right text-sm text-slate-500 sm:max-w-xs">
                {locationSummary}
              </p>
            )}
            {statusMessage && (
              <p
                className={cn(
                  "shrink-0 text-xs font-medium",
                  saveStatus === "saved" ? "text-green-700" : "text-slate-500",
                )}
              >
                {statusMessage}
              </p>
            )}
          </div>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Tap empty space or the{" "}
          <span className="font-medium text-slate-700">+</span> to add a slot.
          Changes save automatically. Slots cannot overlap.
        </p>
        {locations.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Add at least one location under Settings before you can add template
            slots. The calendar will stay blank until then.
          </p>
        )}
      </div>

      <TemplateWeekCalendar
        slots={draftSlots}
        locations={locations}
        scheduleStartTime={scheduleStartTime}
        scheduleEndTime={scheduleEndTime}
        onSlotsChange={handleSlotsChange}
        disabled={saveStatus === "saving"}
      />

      <div className="space-y-4 px-4 pt-4 sm:px-5 sm:pb-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

const TEMPLATE_APPLY_HINT =
  "Apply this template from the Schedule tab, one week at a time.";

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
  const viewSlots = useMemo(
    () => (template ? slotsToDraft(template.slots, locations) : []),
    [template, locations],
  );

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
    onSaved();
  }

  return (
    <Card className="overflow-hidden !p-0">
      <div className="p-4 sm:p-5 sm:pb-4">
        <h2 className="font-semibold">Weekly template</h2>
        <p className="mt-1 text-sm text-slate-500">{TEMPLATE_APPLY_HINT}</p>
      </div>
      <TemplateEditorForm
        key={template?.id ?? "new"}
        initialSlots={viewSlots}
        locations={locations}
        scheduleStartTime={scheduleStartTime}
        scheduleEndTime={scheduleEndTime}
        onSubmit={saveTemplate}
      />
    </Card>
  );
}

export { draftToPayload, slotsToDraft, templateLocationSummary };
