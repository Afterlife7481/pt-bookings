"use client";

import { useMemo, useState } from "react";
import { SheetModal } from "@/components/SheetModal";
import { cn } from "@/lib/utils";
import type { CalendarExportOption } from "@/lib/calendar/ics";

function preferAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod|Macintosh|Mac OS X/i.test(navigator.userAgent);
}

function preferAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function sortCalendarOptions(
  options: CalendarExportOption[],
): CalendarExportOption[] {
  const priority = preferAppleDevice()
    ? ["apple", "google", "outlook", "other"]
    : preferAndroidDevice()
      ? ["google", "apple", "outlook", "other"]
      : ["google", "apple", "outlook", "other"];

  const rank = new Map(priority.map((id, index) => [id, index]));
  return [...options].sort(
    (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99),
  );
}

const triggerClassName =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50";

export function AddToCalendarButton({
  options,
  sessionLabel,
  className,
}: {
  options: CalendarExportOption[];
  sessionLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sortedOptions = useMemo(() => sortCalendarOptions(options), [options]);

  return (
    <>
      <button
        type="button"
        className={cn(triggerClassName, className)}
        onClick={() => setOpen(true)}
      >
        Add to calendar
      </button>

      {open ? (
        <SheetModal
          title="Add to calendar"
          subtitle={
            sessionLabel
              ? `Choose where to save ${sessionLabel}.`
              : "Choose your calendar app."
          }
          onClose={() => setOpen(false)}
        >
          <ul className="mt-4 space-y-2">
            {sortedOptions.map((option) => (
              <li key={option.id}>
                <a
                  href={option.href}
                  target={option.external ? "_blank" : undefined}
                  rel={option.external ? "noopener noreferrer" : undefined}
                  download={option.id === "other" ? "" : undefined}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="block text-sm font-medium text-slate-900">
                    {option.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {option.hint}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            {preferAppleDevice()
              ? "On iPhone or Mac, choose Apple Calendar — your device may ask which app to open."
              : "If you are not sure, pick the app you normally use for appointments."}
          </p>
        </SheetModal>
      ) : null}
    </>
  );
}
