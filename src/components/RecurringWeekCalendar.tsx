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
  isCurrentClient: boolean;
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

function SlotCell({
  dayOfWeek,
  startTime,
  assignment,
  selected,
  onToggle,
}: {
  dayOfWeek: number;
  startTime: string;
  assignment: RecurringSlotAssignment | null;
  selected: boolean;
  onToggle: (dayOfWeek: number, startTime: string) => void;
}) {
  const bookedByOther = assignment && !assignment.isCurrentClient;

  return (
    <button
      type="button"
      disabled={!!bookedByOther}
      onClick={() => onToggle(dayOfWeek, startTime)}
      title={
        bookedByOther
          ? `Booked by ${assignment!.clientName}`
          : startTime
      }
      className={cn(
        "h-10 w-full rounded border px-0.5 py-0.5 text-center transition",
        bookedByOther &&
          "cursor-not-allowed border-amber-200 bg-amber-50 opacity-90",
        !bookedByOther &&
          selected &&
          "border-slate-900 bg-slate-900 text-white ring-1 ring-slate-900",
        !bookedByOther &&
          !selected &&
          assignment?.isCurrentClient &&
          "border-green-300 bg-green-50",
        !bookedByOther &&
          !selected &&
          !assignment &&
          "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50",
      )}
    >
      <span className="block truncate text-[9px] font-medium leading-tight">
        {bookedByOther ? (
          <span className="text-amber-800">{assignment!.clientName}</span>
        ) : selected ? (
          <span className="text-white">✓</span>
        ) : assignment?.isCurrentClient ? (
          <span className="text-green-700">Saved</span>
        ) : null}
      </span>
    </button>
  );
}

export function RecurringWeekCalendar({
  assignments,
  selectedSlotKeys,
  onToggle,
  scheduleStartTime = DEFAULT_SCHEDULE_START,
  scheduleEndTime = DEFAULT_SCHEDULE_END,
}: {
  assignments: RecurringSlotAssignment[];
  selectedSlotKeys: Set<string>;
  onToggle: (dayOfWeek: number, startTime: string) => void;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
}) {
  const assignmentMap = useMemo(() => buildAssignmentMap(assignments), [assignments]);
  const hours = useMemo(
    () => hoursInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );

  return (
    <WeeklyHourGrid
      className="mt-4"
      hours={hours}
      variant="compact"
      getDayHeader={dayHeaderInitial}
      renderCell={(dayOfWeek, hour) => {
        const startTime = hourToStartTime(hour);
        const assignment = assignmentMap.get(`${dayOfWeek}-${hour}`) ?? null;
        return (
          <SlotCell
            dayOfWeek={dayOfWeek}
            startTime={startTime}
            assignment={assignment}
            selected={selectedSlotKeys.has(recurringSlotKey(dayOfWeek, startTime))}
            onToggle={onToggle}
          />
        );
      }}
    />
  );
}
