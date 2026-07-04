import { cn } from "@/lib/utils";
import type { ScheduleEntry } from "@/lib/services/schedule";
import { formatTimeRange, slotTimeLabel } from "@/lib/constants";
import {
  bookedSlotColorClasses,
  bookedSlotSubtextClasses,
  openSlotColorClasses,
  openSlotTextClasses,
} from "./schedule-utils";

function entryTimeRange(entry: ScheduleEntry) {
  return formatTimeRange(slotTimeLabel(entry.startAt), slotTimeLabel(entry.endAt));
}

export function ScheduleCell({
  entry,
  editable,
  onOpen,
  selected,
  mobile = false,
  compact = false,
  onPastDay = false,
}: {
  entry: ScheduleEntry;
  editable?: boolean;
  onOpen?: (entry: ScheduleEntry) => void;
  selected?: boolean;
  mobile?: boolean;
  compact?: boolean;
  onPastDay?: boolean;
}) {
  const booked = entry.booking && entry.status !== "available";
  const sizeClass = mobile
    ? "h-full min-h-0 px-3 py-2"
    : "h-full min-h-0 px-1 py-0.5";
  const nameClass = mobile
    ? "text-sm font-medium"
    : compact
      ? "truncate text-[9px] font-medium leading-tight"
      : "truncate text-[10px] font-medium";
  const subClass = mobile ? "text-xs" : compact ? "text-[8px] leading-tight" : "text-[9px]";

  const timeLabel = entryTimeRange(entry);

  if (booked && entry.booking) {
    const recurring = entry.booking.isRecurring;

    return (
      <a
        href={`/dashboard/sessions/${entry.booking.id}`}
        title={
          entry.location
            ? `${timeLabel} · ${entry.booking.clientName} · ${entry.location.name}`
            : `${timeLabel} · ${entry.booking.clientName}`
        }
        className={cn(
          sizeClass,
          "flex w-full flex-col items-center justify-center rounded-lg border text-center transition",
          bookedSlotColorClasses(recurring, onPastDay),
        )}
      >
        <span className={cn(nameClass, "w-full truncate")}>
          {entry.booking.clientName}
        </span>
        {entry.location && (
          <span
            className={cn(
              subClass,
              "w-full truncate",
              bookedSlotSubtextClasses(recurring, onPastDay),
            )}
          >
            {entry.location.name}
          </span>
        )}
      </a>
    );
  }

  if (editable && onOpen) {
    const lm = entry.lastMinute;
    const isHeld = !!lm?.heldForClientId;
    const hasMatch = (lm?.eligibleCount ?? 0) > 0;

    return (
      <button
        type="button"
        onClick={() => onOpen(entry)}
        title={
          isHeld && lm?.heldClientName
            ? `${timeLabel} · Held for ${lm.heldClientName}`
            : hasMatch
              ? `${timeLabel} · ${lm!.eligibleCount} last-minute match${lm!.eligibleCount === 1 ? "" : "es"}`
              : entry.location
                ? `${timeLabel} · ${entry.location.name}`
                : `${timeLabel} · Open slot`
        }
        className={cn(
          sizeClass,
          "flex w-full flex-col items-center justify-center rounded-lg border text-center transition",
          openSlotColorClasses(lm, !!selected, onPastDay),
        )}
      >
        {isHeld ? (
          <>
            {lm?.heldClientName && (
              <span
                className={cn(
                  nameClass,
                  "w-full truncate",
                  openSlotTextClasses(lm, "primary", onPastDay),
                )}
              >
                {lm.heldClientName}
              </span>
            )}
            {entry.location && (
              <span
                className={cn(
                  subClass,
                  "w-full truncate text-center",
                  openSlotTextClasses(lm, "secondary", onPastDay),
                )}
              >
                {entry.location.name}
              </span>
            )}
          </>
        ) : (
          <>
            {entry.location && (
              <span
                className={cn(
                  nameClass,
                  "w-full truncate",
                  openSlotTextClasses(lm, "primary", onPastDay),
                )}
              >
                {entry.location.name}
              </span>
            )}
            {hasMatch && (
              <span
                className={cn(
                  subClass,
                  "w-full truncate text-center",
                  openSlotTextClasses(lm, "secondary", onPastDay),
                )}
              >
                {lm!.eligibleCount} client{lm!.eligibleCount === 1 ? "" : "s"}
              </span>
            )}
          </>
        )}
      </button>
    );
  }

  const lm = entry.lastMinute;

  return (
    <div
      className={cn(
        sizeClass,
        "flex flex-col items-center justify-center rounded-lg border text-center",
        openSlotColorClasses(lm, false, onPastDay),
      )}
    >
      {entry.location && (
        <span
          className={cn(
            nameClass,
            "w-full truncate",
            openSlotTextClasses(lm, "primary", onPastDay),
          )}
        >
          {entry.location.name}
        </span>
      )}
      {(lm?.eligibleCount ?? 0) > 0 && (
        <span
          className={cn(
            subClass,
            "w-full truncate text-center",
            openSlotTextClasses(lm, "secondary", onPastDay),
          )}
        >
          {lm!.eligibleCount} client{lm!.eligibleCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
