"use client";

import type { ReactNode } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import type {
  RecurringSlotAssignment,
  TemplateSlotOverlay,
} from "@/components/RecurringWeekCalendar";

type EnabledLocation = { id: string; name: string };

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function RecurringSlotDetailModal({
  dayOfWeek,
  startTime,
  assignment,
  templateSlot,
  currentClientName,
  enabledLocations,
  canManageRecurring,
  hasTemplate,
  saving,
  error,
  onClose,
  onSave,
  onRemove,
}: {
  dayOfWeek: number;
  startTime: string;
  assignment: RecurringSlotAssignment | null;
  templateSlot: TemplateSlotOverlay | null;
  currentClientName: string;
  enabledLocations: EnabledLocation[];
  canManageRecurring: boolean;
  hasTemplate: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const bookedByOther = assignment && !assignment.isCurrentClient;
  const isSaved = assignment?.isCurrentClient ?? false;
  const assignmentLocation =
    assignment?.locationName ?? templateSlot?.locationName ?? null;

  const templateLocationEnabled =
    templateSlot &&
    enabledLocations.some((loc) => loc.id === templateSlot.locationId);

  const statusLabel = bookedByOther
    ? `Assigned to ${assignment!.clientName}`
    : isSaved
      ? "Saved for this client"
      : templateSlot
        ? "Available (template slot)"
        : "Available";

  const canSave =
    canManageRecurring &&
    !bookedByOther &&
    !isSaved &&
    templateSlot &&
    templateLocationEnabled;
  const canRemove = canManageRecurring && !bookedByOther && isSaved;

  return (
    <SheetModal
      title={`${dayOfWeekLabel(dayOfWeek)} ${startTime}`}
      subtitle="Recurring slot details"
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          {canSave && (
            <Button type="button" disabled={saving} onClick={() => void onSave()}>
              {saving ? "Saving…" : "Save recurring slot"}
            </Button>
          )}
          {canRemove && (
            <Button
              type="button"
              variant="danger"
              disabled={saving}
              onClick={() => void onRemove()}
            >
              {saving ? "Saving…" : "Remove recurring slot"}
            </Button>
          )}
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <DetailRow label="Status" value={statusLabel} />

        {error && (
          <InlineNotice tone="error">{error}</InlineNotice>
        )}

        {bookedByOther && (
          <>
            <DetailRow label="Client" value={assignment!.clientName} />
            {assignmentLocation && (
              <DetailRow label="Location" value={assignmentLocation} />
            )}
          </>
        )}

        {!bookedByOther && isSaved && (
          <>
            <DetailRow label="Client" value={currentClientName} />
            {assignmentLocation && (
              <DetailRow label="Location" value={assignmentLocation} />
            )}
          </>
        )}

        {templateSlot && (
          <>
            <DetailRow
              label="Weekly template"
              value={`${templateSlot.startTime}–${templateSlot.endTime} · ${templateSlot.locationName}`}
            />
            {!isSaved && !bookedByOther && (
              <DetailRow label="Location" value={templateSlot.locationName} />
            )}
          </>
        )}

        {!hasTemplate && (
          <InlineNotice tone="warning">
            Create a weekly template before assigning recurring slots.
          </InlineNotice>
        )}

        {hasTemplate && !templateSlot && !bookedByOther && (
          <InlineNotice tone="warning">
            There is no weekly template slot at this time. Recurring assignments
            must match a template slot.
          </InlineNotice>
        )}

        {hasTemplate && enabledLocations.length === 0 && !bookedByOther && (
          <InlineNotice tone="warning">
            Enable at least one location for this client before adding recurring
            slots.
          </InlineNotice>
        )}

        {templateSlot && !templateLocationEnabled && !bookedByOther && !isSaved && (
          <InlineNotice tone="warning">
            Enable <strong>{templateSlot.locationName}</strong> for this client
            to assign this recurring slot. The location must match the weekly
            template — it cannot be changed.
          </InlineNotice>
        )}

        {canSave && templateSlot && (
          <InlineNotice tone="warning">
            This will save a recurring slot for{" "}
            <strong>{currentClientName}</strong> at{" "}
            <strong>{templateSlot.locationName}</strong>.
          </InlineNotice>
        )}
      </div>
    </SheetModal>
  );
}
