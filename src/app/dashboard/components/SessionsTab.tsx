"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { SessionWhen } from "@/components/SessionWhen";
import { cn, splitClientName } from "@/lib/utils";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { isWallClockPast, wallClockToUtcMs } from "@/lib/zoned-time";
import { useTrainerSettings } from "../hooks/useTrainerSettings";
import type { BookingRow } from "../types";

type SessionsView = "upcoming" | "past";

function isPastSession(startAt: string, timeZone: string): boolean {
  return isWallClockPast(startAt, timeZone);
}

function sessionSortKey(startAt: string, timeZone: string): number {
  return wallClockToUtcMs(startAt, timeZone);
}

function SessionsViewToggle({
  value,
  onChange,
}: {
  value: SessionsView;
  onChange: (view: SessionsView) => void;
}) {
  return (
    <div
      className="inline-flex w-fit shrink-0 self-start rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="tablist"
      aria-label="Sessions view"
    >
      {(
        [
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition",
            value === option.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 active:bg-slate-100",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SessionsList({ rows }: { rows: BookingRow[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => {
        const { givenName, surname } = splitClientName(row.client.name);
        return (
          <li key={row.booking.id}>
            <Link
              href={`/dashboard/sessions/${row.booking.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
            >
              <span className="flex min-w-0 flex-[0_0_32%] flex-col text-sm font-medium leading-snug text-slate-900">
                <span>{givenName}</span>
                {surname ? <span>{surname}</span> : null}
              </span>
              <span className="min-w-0 flex-[0_0_38%] text-sm text-slate-600">
                <SessionWhen startAt={row.slot.startAt} endAt={row.slot.endAt} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                {row.booking.status === "voided" ? (
                  <Badge tone="danger">Voided</Badge>
                ) : (
                  <PaymentStatusBadge
                    sessionPaid={row.booking.sessionPaid}
                    invoiceSentAt={row.booking.invoiceSentAt}
                  />
                )}
              </span>
              <span aria-hidden className="shrink-0 text-slate-400">
                ›
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SessionsTab({ bookings }: { bookings: BookingRow[] }) {
  const [view, setView] = useState<SessionsView>("upcoming");
  const { settings } = useTrainerSettings();
  const timeZone = settings?.timezone ?? DEFAULT_TIMEZONE;

  const { upcoming, past } = useMemo(() => {
    const upcomingRows = bookings
      .filter((b) => !isPastSession(b.slot.startAt, timeZone))
      .sort(
        (a, b) =>
          sessionSortKey(a.slot.startAt, timeZone) -
          sessionSortKey(b.slot.startAt, timeZone),
      );
    const pastRows = bookings
      .filter((b) => isPastSession(b.slot.startAt, timeZone))
      .sort(
        (a, b) =>
          sessionSortKey(b.slot.startAt, timeZone) -
          sessionSortKey(a.slot.startAt, timeZone),
      );

    return { upcoming: upcomingRows, past: pastRows };
  }, [bookings, timeZone]);

  const rows = view === "upcoming" ? upcoming : past;
  const emptyMessage =
    bookings.length === 0
      ? "No sessions yet. Apply a template first."
      : view === "upcoming"
        ? "No upcoming sessions."
        : "No past sessions.";

  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold">Sessions</h2>
        <SessionsViewToggle value={view} onChange={setView} />
        <p className="text-sm text-slate-500">
          {view === "upcoming"
            ? upcoming.length === 0
              ? "No upcoming sessions"
              : `${upcoming.length} upcoming`
            : past.length === 0
              ? "No past sessions"
              : `${past.length} past`}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <SessionsList rows={rows} />
      )}
    </Card>
  );
}
