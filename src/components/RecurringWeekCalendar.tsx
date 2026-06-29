import { useMemo } from "react";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  hoursInScheduleRange,
} from "@/lib/constants";
import {
  dayHeaderInitial,
  hourFromTime,
  hourToStartTime,
  parseRecurringSlotKey,
  recurringSlotKey,
} from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";

export type RecurringSlotAssignment = {
  dayOfWeek: number;
  startTime: string;
  clientId: string;
  clientName: string;
  locationName: string | null;
  isCurrentClient: boolean;
};

export type TemplateSlotOverlay = {
  dayOfWeek: number;
  startTime: string;
  locationId: string;
  locationName: string;
};

export type SelectedRecurringSlot = {
  dayOfWeek: number;
  startTime: string;
  locationId: string;
  locationName: string;
};

/** @deprecated Import from `@/lib/schedule-grid` as `recurringSlotKey`. */
export const slotKey = recurringSlotKey;

/** @deprecated Import from `@/lib/schedule-grid` as `parseRecurringSlotKey`. */
export const parseSlotKey = parseRecurringSlotKey;

function buildAssignmentMap(assignments: RecurringSlotAssignment[]) {
  const map = new Map<string, RecurringSlotAssignment>();
  for (const assignment of assignments) {
    map.set(`${assignment.dayOfWeek}-${hourFromTime(assignment.startTime)}`, assignment);
  }
  return map;
}

function buildOverlayMap(overlay: TemplateSlotOverlay[]) {
  const map = new Map<string, TemplateSlotOverlay>();
  for (const slot of overlay) {
    map.set(`${slot.dayOfWeek}-${hourFromTime(slot.startTime)}`, slot);
  }
  return map;
}

function SlotCell({
  assignment,
  templateOverlay,
  selected,
  onOpen,
}: {
  assignment: RecurringSlotAssignment | null;
  templateOverlay: TemplateSlotOverlay | null;
  selected: SelectedRecurringSlot | null;
  onOpen: () => void;
}) {
  const bookedByOther = assignment && !assignment.isCurrentClient;
  const assignmentLocation =
    assignment?.locationName ?? templateOverlay?.locationName ?? null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="View slot details"
      className={cn(
        "relative h-full min-h-0 w-full rounded border px-0.5 py-0.5 text-center transition hover:ring-2 hover:ring-slate-300 hover:ring-offset-1",
        bookedByOther && "border-amber-200 bg-amber-50",
        !bookedByOther &&
          selected &&
          "border-slate-900 bg-slate-900 ring-1 ring-slate-900",
        !bookedByOther &&
          !selected &&
          assignment?.isCurrentClient &&
          "border-green-300 bg-green-50",
        !bookedByOther &&
          !selected &&
          !assignment &&
          templateOverlay &&
          "border-dashed border-slate-300 bg-slate-50/80",
        !bookedByOther &&
          !selected &&
          !assignment &&
          !templateOverlay &&
          "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50",
      )}
    >
      <span className="block text-[9px] font-medium leading-tight">
        {bookedByOther ? (
          <>
            <span className="block truncate text-amber-800">
              {assignment!.clientName}
            </span>
            {assignmentLocation && (
              <span className="block truncate text-[8px] font-normal text-amber-700">
                {assignmentLocation}
              </span>
            )}
          </>
        ) : selected ? (
          <>
            <span className="text-white">✓</span>
            <span className="block truncate text-[8px] font-normal text-slate-200">
              {selected.locationName}
            </span>
          </>
        ) : assignment?.isCurrentClient ? (
          <>
            <span className="text-green-700">Saved</span>
            {assignmentLocation && (
              <span className="block truncate text-[8px] font-normal text-green-600">
                {assignmentLocation}
              </span>
            )}
          </>
        ) : templateOverlay ? (
          <span className="block truncate text-slate-500">
            {templateOverlay.locationName}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function RecurringWeekCalendar({
  assignments,
  selectedSlots,
  templateOverlay = [],
  onCellClick,
  scheduleStartTime = DEFAULT_SCHEDULE_START,
  scheduleEndTime = DEFAULT_SCHEDULE_END,
}: {
  assignments: RecurringSlotAssignment[];
  selectedSlots: Map<string, SelectedRecurringSlot>;
  templateOverlay?: TemplateSlotOverlay[];
  onCellClick: (dayOfWeek: number, startTime: string) => void;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
}) {
  const assignmentMap = useMemo(() => buildAssignmentMap(assignments), [assignments]);
  const overlayMap = useMemo(() => buildOverlayMap(templateOverlay), [templateOverlay]);
  const hours = useMemo(
    () => hoursInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );

  return (
    <WeeklyHourGrid
      className="mt-4"
      hours={hours}
      variant="compact"
      compactRowSize="3rem"
      getDayHeader={dayHeaderInitial}
      renderCell={(dayOfWeek, hour) => {
        const startTime = hourToStartTime(hour);
        const key = recurringSlotKey(dayOfWeek, startTime);
        return (
          <SlotCell
            assignment={assignmentMap.get(`${dayOfWeek}-${hour}`) ?? null}
            templateOverlay={overlayMap.get(`${dayOfWeek}-${hour}`) ?? null}
            selected={selectedSlots.get(key) ?? null}
            onOpen={() => onCellClick(dayOfWeek, startTime)}
          />
        );
      }}
    />
  );
}
