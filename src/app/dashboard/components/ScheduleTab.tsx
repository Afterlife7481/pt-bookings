"use client";

import { Button, Card, InlineNotice } from "@/components/ui";
import { WeekScheduleCalendar } from "@/components/WeekScheduleCalendar";
import type { ScheduleEntry } from "@/lib/services/schedule";
import type { DashboardClient, DashboardTemplate, TrainerLocation, TrainerSettings } from "../types";

export function ScheduleTab({
  settings,
  weekStart,
  scheduleRange,
  scheduleEntries,
  templates,
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
  templates: DashboardTemplate[];
  clients: DashboardClient[];
  trainerLocations: TrainerLocation[];
  applyingTemplate: boolean;
  scheduleError: string | null;
  onDismissError: () => void;
  onChangeWeek: (delta: number) => void;
  onGoToThisWeek: () => void;
  onApplyTemplate: (templateId: string) => Promise<boolean>;
  onAddSlot: (dayOfWeek: number, startTime: string, locationId: string) => Promise<void>;
  onRemoveSlot: (slotId: string) => Promise<void>;
  onAllocateSlot: (slotId: string, clientId: string) => Promise<void>;
  onUpdateSlotLocation: (slotId: string, locationId: string) => Promise<void>;
  onRefresh: () => void;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3">
        <h2 className="font-semibold">Weekly schedule</h2>
        <p className="text-sm text-slate-600">
          Open slots show last-minute matches. Click to send offers or allocate directly.
        </p>
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
          weekStart={scheduleRange.weekStart || weekStart}
          entries={scheduleEntries}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          onApplyTemplate={onApplyTemplate}
          applyingTemplate={applyingTemplate}
          scheduleStartTime={settings.scheduleStartTime}
          scheduleEndTime={settings.scheduleEndTime}
          defaultView={settings.scheduleDefaultView}
          lockHours={settings.lastMinuteOfferLockHours}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          locations={trainerLocations}
          onAddSlot={onAddSlot}
          onRemoveSlot={onRemoveSlot}
          onAllocateSlot={onAllocateSlot}
          onUpdateSlotLocation={onUpdateSlotLocation}
          onRefresh={onRefresh}
        />
      ) : (
        <p className="text-sm text-slate-500">Loading schedule…</p>
      )}
    </Card>
  );
}
