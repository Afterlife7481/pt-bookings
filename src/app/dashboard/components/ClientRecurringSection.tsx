"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import {
  RecurringWeekCalendar,
  slotKey,
  type RecurringSlotAssignment,
  type SelectedRecurringSlot,
  type TemplateSlotOverlay,
} from "@/components/RecurringWeekCalendar";
import { RecurringSlotDetailModal } from "@/components/RecurringSlotDetailModal";
import type {
  ClientDetail,
  ClientLocationOption,
} from "../clients/[id]/client-types";

export function ClientRecurringSection({
  clientId,
  showHeading = true,
}: {
  clientId: string;
  showHeading?: boolean;
}) {
  const [clientName, setClientName] = useState("");
  const [locations, setLocations] = useState<ClientLocationOption[]>([]);
  const [recurringPreferences, setRecurringPreferences] = useState<
    ClientDetail["recurringPreferences"]
  >([]);
  const [recurringAssignments, setRecurringAssignments] = useState<
    RecurringSlotAssignment[]
  >([]);
  const [templateOverlay, setTemplateOverlay] = useState<TemplateSlotOverlay[]>(
    [],
  );
  const [hasTemplate, setHasTemplate] = useState(true);
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [selectedSlots, setSelectedSlots] = useState<
    Map<string, SelectedRecurringSlot>
  >(new Map());
  const [detailSlot, setDetailSlot] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecurringOptions = useCallback(
    async (
      prefs: ClientDetail["recurringPreferences"],
      clientLocations: ClientLocationOption[],
    ) => {
      setError(null);
      const res = await fetch(`/api/clients/${clientId}/recurring-options`);
      const data: {
        assignments: RecurringSlotAssignment[];
        scheduleStartTime: string;
        scheduleEndTime: string;
        hasTemplate: boolean;
        templateOverlay: TemplateSlotOverlay[];
      } = await res.json();
      setRecurringAssignments(data.assignments);
      setScheduleStartTime(data.scheduleStartTime);
      setScheduleEndTime(data.scheduleEndTime);
      setHasTemplate(data.hasTemplate);
      setTemplateOverlay(data.templateOverlay);

      const locationNameById = new Map(
        clientLocations.map((loc) => [loc.id, loc.name]),
      );
      const enabledIds = new Set(
        clientLocations.filter((loc) => loc.enabled).map((loc) => loc.id),
      );
      const overlayByKey = new Map(
        data.templateOverlay.map((slot) => [
          slotKey(slot.dayOfWeek, slot.startTime),
          slot,
        ]),
      );

      const next = new Map<string, SelectedRecurringSlot>();
      for (const pref of prefs) {
        const key = slotKey(pref.dayOfWeek, pref.startTime);
        const overlay = overlayByKey.get(key);
        if (!overlay) continue;
        if (pref.locationId && pref.locationId !== overlay.locationId) continue;
        if (!enabledIds.has(overlay.locationId)) continue;
        next.set(key, {
          dayOfWeek: pref.dayOfWeek,
          startTime: pref.startTime,
          locationId: overlay.locationId,
          locationName:
            locationNameById.get(overlay.locationId) ?? overlay.locationName,
        });
      }
      setSelectedSlots(next);
    },
    [clientId],
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (!res.ok) {
      setLoading(false);
      setError("Failed to load client");
      return;
    }
    const data: ClientDetail = await res.json();
    setClientName(data.name);
    setLocations(data.locations);
    setRecurringPreferences(data.recurringPreferences);
    await loadRecurringOptions(data.recurringPreferences, data.locations);
    setLoading(false);
  }, [clientId, loadRecurringOptions]);

  useEffect(() => {
    load();
  }, [load]);

  const enabledLocations = locations.filter((loc) => loc.enabled);
  const enabledLocationIds = new Set(enabledLocations.map((l) => l.id));
  const canManageRecurring = hasTemplate && enabledLocations.length > 0;

  function openSlotDetail(dayOfWeek: number, startTime: string) {
    setError(null);
    setDetailSlot({ dayOfWeek, startTime });
  }

  async function saveRecurringSlots(
    slots: SelectedRecurringSlot[],
  ): Promise<boolean> {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recurringSlots: slots.map(({ dayOfWeek, startTime, locationId }) => ({
          dayOfWeek,
          startTime,
          locationId,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return false;
    }

    const detail = data as ClientDetail;
    setLocations(detail.locations);
    setRecurringPreferences(detail.recurringPreferences);
    await loadRecurringOptions(detail.recurringPreferences, detail.locations);
    return true;
  }

  async function saveSlotFromDetail() {
    if (!detailSlot) return;

    const overlay = templateOverlay.find(
      (slot) =>
        slot.dayOfWeek === detailSlot.dayOfWeek &&
        slot.startTime === detailSlot.startTime,
    );
    if (!overlay || !enabledLocationIds.has(overlay.locationId)) return;

    const key = slotKey(detailSlot.dayOfWeek, detailSlot.startTime);
    const next = new Map(selectedSlots);
    next.set(key, {
      dayOfWeek: detailSlot.dayOfWeek,
      startTime: detailSlot.startTime,
      locationId: overlay.locationId,
      locationName: overlay.locationName,
    });

    const ok = await saveRecurringSlots([...next.values()]);
    if (ok) setDetailSlot(null);
  }

  async function removeSlotFromDetail() {
    if (!detailSlot) return;

    const key = slotKey(detailSlot.dayOfWeek, detailSlot.startTime);
    const next = new Map(selectedSlots);
    next.delete(key);

    const ok = await saveRecurringSlots([...next.values()]);
    if (ok) setDetailSlot(null);
  }

  return (
    <>
      <Card className="overflow-hidden !p-0">
        <div className="p-4 sm:p-5 sm:pb-4">
          {showHeading ? (
            <h2 className="font-semibold">Recurring slots</h2>
          ) : null}
          <p
            className={
              showHeading ? "mt-1 text-sm text-slate-600" : "text-sm text-slate-600"
            }
          >
            Assign recurring sessions from your weekly template. Each slot uses
            the template&apos;s location — enable that location for the client
            first, then click a template slot and save from the modal.
          </p>

          {!loading && !hasTemplate && (
            <p className="mt-4 text-sm text-red-700">
              Create a weekly template before assigning recurring slots.{" "}
              <Link href="/dashboard/settings/templates" className="underline">
                Create template →
              </Link>
            </p>
          )}

          {!loading && hasTemplate && enabledLocations.length === 0 && (
            <p className="mt-4 text-sm text-red-700">
              Select at least one available location for this client before
              adding recurring slots.{" "}
              <Link
                href={`/dashboard/clients/${clientId}/locations`}
                className="underline"
              >
                Manage locations →
              </Link>
            </p>
          )}

          {error && !detailSlot && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          {loading && (
            <p className="mt-4 text-sm text-slate-500">Loading schedule…</p>
          )}
        </div>

        {!loading && (
          <RecurringWeekCalendar
            assignments={recurringAssignments}
            selectedSlots={selectedSlots}
            templateOverlay={templateOverlay}
            onCellClick={openSlotDetail}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
          />
        )}

        {recurringPreferences.length > 0 && (
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => saveRecurringSlots([])}
            >
              {saving ? "Clearing…" : "Clear all recurring slots"}
            </Button>
          </div>
        )}
      </Card>

      {detailSlot && (
        <RecurringSlotDetailModal
          dayOfWeek={detailSlot.dayOfWeek}
          startTime={detailSlot.startTime}
          assignment={
            recurringAssignments.find(
              (a) =>
                slotKey(a.dayOfWeek, a.startTime) ===
                slotKey(detailSlot.dayOfWeek, detailSlot.startTime),
            ) ?? null
          }
          templateSlot={
            templateOverlay.find(
              (slot) =>
                slot.dayOfWeek === detailSlot.dayOfWeek &&
                slot.startTime === detailSlot.startTime,
            ) ?? null
          }
          currentClientName={clientName}
          enabledLocations={enabledLocations}
          canManageRecurring={canManageRecurring}
          hasTemplate={hasTemplate}
          saving={saving}
          error={error}
          onClose={() => !saving && setDetailSlot(null)}
          onSave={saveSlotFromDetail}
          onRemove={removeSlotFromDetail}
        />
      )}
    </>
  );
}
