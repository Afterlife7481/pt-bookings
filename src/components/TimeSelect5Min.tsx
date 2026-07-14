"use client";

import { useMemo } from "react";
import {
  SCHEDULE_BOOKING_STEP_MINUTES,
  formatMinutesAsTime,
  parseTimeToMinutes,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);

const MINUTE_OPTIONS = Array.from(
  { length: 60 / SCHEDULE_BOOKING_STEP_MINUTES },
  (_, index) => String(index * SCHEDULE_BOOKING_STEP_MINUTES).padStart(2, "0"),
);

export function snapTimeToBookingStep(time: string): string {
  const total = parseTimeToMinutes(time);
  if (!Number.isFinite(total)) return "09:00";
  const snapped =
    Math.round(total / SCHEDULE_BOOKING_STEP_MINUTES) *
    SCHEDULE_BOOKING_STEP_MINUTES;
  return formatMinutesAsTime(snapped);
}

/** Hour + minute selects limited to the booking snap (5 minutes). */
export function TimeSelect5Min({
  value,
  onChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const snapped = useMemo(() => snapTimeToBookingStep(value), [value]);
  const [hour, minute] = snapped.split(":");

  function update(nextHour: string, nextMinute: string) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm tabular-nums";

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={ariaLabel}
    >
      <select
        id={id}
        className={selectClass}
        value={hour}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} hour` : "Hour"}
        onChange={(e) => update(e.target.value, minute ?? "00")}
      >
        {HOUR_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-slate-400" aria-hidden>
        :
      </span>
      <select
        className={selectClass}
        value={minute}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} minute` : "Minute"}
        onChange={(e) => update(hour ?? "09", e.target.value)}
      >
        {MINUTE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
