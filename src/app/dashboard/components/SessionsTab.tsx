"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { SessionWhen } from "@/components/SessionWhen";
import { cn } from "@/lib/utils";
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

function bookingSourceBadge(isRecurring: boolean) {
  return isRecurring ? (
    <Badge tone="success">Recurring</Badge>
  ) : (
    <Badge>Manual</Badge>
  );
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

function SessionsTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: "32%" }} />
      <col style={{ width: "38%" }} />
      <col style={{ width: "30%" }} />
    </colgroup>
  );
}

function SessionsTable({ rows }: { rows: BookingRow[] }) {
  return (
    <table className="w-full min-w-0 table-fixed text-left text-sm">
      <SessionsTableColGroup />
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => (
          <tr key={row.booking.id} className="hover:bg-slate-50">
            <td className="min-w-0 px-4 py-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-slate-900">{row.client.name}</span>
                <Link
                  href={`/dashboard/sessions/${row.booking.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Session
                </Link>
              </div>
            </td>
            <td className="min-w-0 px-4 py-3 text-slate-600">
              <SessionWhen startAt={row.slot.startAt} endAt={row.slot.endAt} />
            </td>
            <td className="min-w-0 px-4 py-3">
              <div className="flex flex-col items-start gap-1.5">
                {row.booking.status === "voided" ? (
                  <Badge tone="danger">Voided</Badge>
                ) : (
                  <>
                    {row.booking.status === "pending_change" ? (
                      <Badge tone="warning">Changing</Badge>
                    ) : (
                      bookingSourceBadge(row.booking.isRecurring)
                    )}
                    <PaymentStatusBadge
                      sessionPaid={row.booking.sessionPaid}
                      invoiceSentAt={row.booking.invoiceSentAt}
                    />
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
        <SessionsTable rows={rows} />
      )}
    </Card>
  );
}
