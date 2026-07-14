"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, InlineNotice } from "@/components/ui";
import {
  ScheduleViewToggle,
  type ScheduleView,
} from "@/components/ScheduleViewToggle";
import { ApplyTemplateModal } from "@/components/schedule/ScheduleModals";
import { WeekScheduleCalendar } from "@/components/WeekScheduleCalendar";
import type { ScheduleEntry, ScheduleHoliday } from "@/lib/services/schedule";
import type { ApplyTemplateOutcome } from "../hooks/useSchedulePage";
import type { DashboardClient, TrainerLocation, TrainerSettings } from "../types";

export function ScheduleTab({
  settings,
  weekStart,
  scheduleRange,
  scheduleEntries,
  scheduleHolidays,
  hasTemplate,
  clients,
  trainerLocations,
  applyingTemplate,
  scheduleError,
  onDismissError,
  onChangeWeek,
  onGoToThisWeek,
  onApplyTemplate,
  onAddSlot,
  onRemoveSlot,
  onAllocateSlot,
  onUpdateSlotLocation,
  onRefresh,
}: {
  settings: TrainerSettings | null;
  weekStart: string;
  scheduleRange: { weekStart: string; weekEnd: string };
  scheduleEntries: ScheduleEntry[];
  scheduleHolidays: ScheduleHoliday[];
  hasTemplate: boolean;
  clients: DashboardClient[];
  trainerLocations: TrainerLocation[];
  applyingTemplate: boolean;
  scheduleError: string | null;
  onDismissError: () => void;
  onChangeWeek: (delta: number) => void;
  onGoToThisWeek: () => void;
  onApplyTemplate: () => Promise<ApplyTemplateOutcome>;
  onAddSlot: (
    dayOfWeek: number,
    startTime: string,
    locationId: string,
    endTime?: string,
  ) => Promise<void>;
  onRemoveSlot: (slotId: string) => Promise<void>;
  onAllocateSlot: (slotId: string, clientId: string) => Promise<void>;
  onUpdateSlotLocation: (slotId: string, locationId: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [viewMode, setViewMode] = useState<ScheduleView>("day");
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [applyTemplateNotice, setApplyTemplateNotice] = useState<ApplyTemplateOutcome | null>(
    null,
  );
  const appliedDefaultView = useRef(false);

  useEffect(() => {
    if (settings && !appliedDefaultView.current) {
      setViewMode(settings.scheduleDefaultView);
      appliedDefaultView.current = true;
    }
  }, [settings]);

  // Only offer apply when the week has no bookings yet (same rule as before).
  const canApplyTemplate = !scheduleEntries.some((entry) => entry.booking);

  return (
    <Card className="!p-0">
      <div className="flex flex-col gap-3 p-4 sm:p-5 sm:pb-4">
        <h2 className="font-semibold">Weekly schedule</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ScheduleViewToggle value={viewMode} onChange={setViewMode} />
          {canApplyTemplate ? (
            <Button
              variant="secondary"
              className="shrink-0"
              disabled={applyingTemplate}
              onClick={() => setApplyTemplateOpen(true)}
            >
              {applyingTemplate ? "Applying…" : "Apply template"}
            </Button>
          ) : null}
        </div>
        {applyTemplateNotice?.ok && applyTemplateNotice.conflicts.length > 0 && (
          <InlineNotice tone="warning" className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-amber-950">
                  Template applied, but {applyTemplateNotice.conflicts.length}{" "}
                  recurring session
                  {applyTemplateNotice.conflicts.length === 1 ? "" : "s"} could
                  not be booked due to time off. Each clash was added to your{" "}
                  <a href="/dashboard/feed" className="underline">
                    Feed
                  </a>{" "}
                  — notify clients from there.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950/90">
                  {applyTemplateNotice.conflicts.map((conflict) => (
                    <li key={conflict}>{conflict}</li>
                  ))}
                </ul>
                {applyTemplateNotice.recommendations.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-amber-950">
                      What you can do
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-950/90">
                      {applyTemplateNotice.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 text-amber-900 underline"
                onClick={() => setApplyTemplateNotice(null)}
              >
                Dismiss
              </button>
            </div>
          </InlineNotice>
        )}
        {scheduleError && (
          <InlineNotice tone="error" className="flex items-start justify-between gap-3">
            <span>{scheduleError}</span>
            <button
              type="button"
              className="shrink-0 text-red-700 underline"
              onClick={onDismissError}
            >
              Dismiss
            </button>
          </InlineNotice>
        )}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <Button
            variant="secondary"
            className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
            onClick={() => onChangeWeek(-1)}
          >
            ← Prev
          </Button>
          <Button
            variant="secondary"
            className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
            onClick={onGoToThisWeek}
          >
            This week
          </Button>
          <Button
            variant="secondary"
            className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
            onClick={() => onChangeWeek(1)}
          >
            Next →
          </Button>
        </div>
      </div>
      {settings ? (
        <WeekScheduleCalendar
          weekStart={weekStart}
          entries={scheduleEntries}
          holidays={scheduleHolidays}
          scheduleStartTime={settings.scheduleStartTime}
          scheduleEndTime={settings.scheduleEndTime}
          viewMode={viewMode}
          lockHours={settings.lastMinuteOfferLockHours}
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            enabledLocationIds: c.enabledLocationIds ?? [],
          }))}
          locations={trainerLocations}
          onChangeWeek={onChangeWeek}
          onAddSlot={onAddSlot}
          onRemoveSlot={onRemoveSlot}
          onAllocateSlot={onAllocateSlot}
          onUpdateSlotLocation={onUpdateSlotLocation}
          onRefresh={onRefresh}
        />
      ) : (
        <p className="px-4 pb-4 text-sm text-slate-500 sm:px-5 sm:pb-5">
          Loading schedule…
        </p>
      )}

      {applyTemplateOpen && (
        <ApplyTemplateModal
          hasTemplate={hasTemplate}
          applying={applyingTemplate}
          onApply={async () => {
            const result = await onApplyTemplate();
            if (result.ok) {
              setApplyTemplateOpen(false);
              if (result.conflicts.length > 0) {
                setApplyTemplateNotice(result);
              } else {
                setApplyTemplateNotice(null);
              }
            }
          }}
          onClose={() => !applyingTemplate && setApplyTemplateOpen(false)}
        />
      )}
    </Card>
  );
}
