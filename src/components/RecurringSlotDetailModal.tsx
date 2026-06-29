"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import type {
  RecurringSlotAssignment,
  SelectedRecurringSlot,
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
  selected,
  templateSlot,
  currentClientName,
  enabledLocations,
  canManageRecurring,
  hasTemplate,
  onClose,
  onAdd,
  onRemove,
}: {
  dayOfWeek: number;
  startTime: string;
  assignment: RecurringSlotAssignment | null;
  selected: SelectedRecurringSlot | null;
  templateSlot: TemplateSlotOverlay | null;
  currentClientName: string;
  enabledLocations: EnabledLocation[];
  canManageRecurring: boolean;
  hasTemplate: boolean;
  onClose: () => void;
  onAdd: (locationId: string) => void;
  onRemove: () => void;
}) {
  const bookedByOther = assignment && !assignment.isCurrentClient;
  const isSelected = selected !== null;
  const assignmentLocation =
    assignment?.locationName ?? templateSlot?.locationName ?? null;
  const displayLocation = selected?.locationName ?? assignmentLocation;

  const templateLocationInEnabled =
    templateSlot &&
    enabledLocations.some((loc) => loc.id === templateSlot.locationId);

  const defaultLocationId =
    (templateSlot &&
      enabledLocations.find((loc) => loc.id === templateSlot.locationId)?.id) ??
    enabledLocations[0]?.id ??
    "";

  const [locationId, setLocationId] = useState(defaultLocationId);

  useEffect(() => {
    setLocationId(defaultLocationId);
  }, [defaultLocationId, dayOfWeek, startTime]);

  const selectedLocation = enabledLocations.find((loc) => loc.id === locationId);
  const differsFromTemplate =
    templateSlot &&
    selectedLocation &&
    selectedLocation.id !== templateSlot.locationId;

  const statusLabel = bookedByOther
    ? `Assigned to ${assignment!.clientName}`
    : isSelected
      ? "Selected (save to confirm)"
      : assignment?.isCurrentClient
        ? "Saved for this client"
        : templateSlot
          ? "Available (template slot)"
          : "Available";

  const canAdd =
    canManageRecurring && !bookedByOther && !isSelected && enabledLocations.length > 0;
  const canRemove = canManageRecurring && !bookedByOther && isSelected;

  return (
    <SheetModal
      title={`${dayOfWeekLabel(dayOfWeek)} ${startTime}`}
      subtitle="Recurring slot details"
      onClose={onClose}
      footer={
        <>
          {canAdd && (
            <Button type="button" onClick={() => onAdd(locationId)}>
              Add recurring slot
            </Button>
          )}
          {canRemove && (
            <Button type="button" variant="danger" onClick={onRemove}>
              Remove from selection
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <DetailRow label="Status" value={statusLabel} />

        {bookedByOther && (
          <>
            <DetailRow label="Client" value={assignment!.clientName} />
            {displayLocation && (
              <DetailRow label="Location" value={displayLocation} />
            )}
          </>
        )}

        {!bookedByOther && isSelected && (
          <>
            <DetailRow label="Client" value={currentClientName} />
            <DetailRow label="Location" value={selected!.locationName} />
          </>
        )}

        {!bookedByOther && !isSelected && assignment?.isCurrentClient && (
          <>
            <DetailRow label="Client" value={currentClientName} />
            {displayLocation && (
              <DetailRow label="Location" value={displayLocation} />
            )}
          </>
        )}

        {templateSlot && (
          <DetailRow label="Weekly template" value={templateSlot.locationName} />
        )}

        {!hasTemplate && (
          <InlineNotice tone="warning">
            Create a weekly template before assigning recurring slots.
          </InlineNotice>
        )}

        {hasTemplate && enabledLocations.length === 0 && !bookedByOther && (
          <InlineNotice tone="warning">
            Enable at least one location for this client before adding recurring
            slots.
          </InlineNotice>
        )}

        {canAdd && (
          <>
            <InlineNotice tone="warning">
              This will be a recurring slot for{" "}
              <strong>{selectedLocation?.name ?? "the selected location"}</strong>.
            </InlineNotice>

            {differsFromTemplate && (
              <InlineNotice tone="warning">
                The weekly template uses{" "}
                <strong>{templateSlot!.locationName}</strong> for this time.
              </InlineNotice>
            )}

            {enabledLocations.length > 1 && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Location</span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  {enabledLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {templateSlot?.locationId === loc.id ? " (template)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {templateSlot && !templateLocationInEnabled && (
              <InlineNotice tone="warning">
                The template location ({templateSlot.locationName}) is not enabled
                for this client.
              </InlineNotice>
            )}
          </>
        )}
      </div>
    </SheetModal>
  );
}
