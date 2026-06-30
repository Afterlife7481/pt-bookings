"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { SessionWhen } from "@/components/SessionWhen";
import { parseLocalDateTime } from "@/lib/constants";
import type { BookingRow } from "../types";

function isPastSession(startAt: string): boolean {
  return parseLocalDateTime(startAt).getTime() < Date.now();
}

function bookingSourceBadge(isRecurring: boolean) {
  return isRecurring ? (
    <Badge tone="success">Recurring</Badge>
  ) : (
    <Badge>Manual</Badge>
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

function SessionsTable({
  rows,
  showHeader = true,
}: {
  rows: BookingRow[];
  showHeader?: boolean;
}) {
  return (
    <table className="w-full min-w-0 table-fixed text-left text-sm">
        <SessionsTableColGroup />
        {showHeader && (
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.booking.id} className="hover:bg-slate-50">
              <td className="min-w-0 px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-900">
                    {row.client.name}
                  </span>
                  <Link
                    href={`/dashboard/sessions/${row.booking.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Session
                  </Link>
                </div>
              </td>
              <td className="min-w-0 px-4 py-3 text-slate-600">
                <SessionWhen
                  startAt={row.slot.startAt}
                  endAt={row.slot.endAt}
                />
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
  const upcoming = bookings.filter((b) => !isPastSession(b.slot.startAt));
  const past = bookings.filter((b) => isPastSession(b.slot.startAt));

  if (bookings.length === 0) {
    return (
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold">Upcoming sessions</h2>
        </div>
        <p className="p-4 text-sm text-slate-500">
          No sessions yet. Apply a template first.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold">Upcoming sessions</h2>
          <p className="text-sm text-slate-500">
            {upcoming.length === 0
              ? "No upcoming sessions"
              : `${upcoming.length} upcoming`}
          </p>
        </div>
        {upcoming.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No upcoming sessions.</p>
        ) : (
          <SessionsTable rows={upcoming} />
        )}
      </Card>

      {past.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold">Past sessions</h2>
            <p className="text-sm text-slate-500">{past.length} past</p>
          </div>
          <SessionsTable rows={past} showHeader={upcoming.length === 0} />
        </Card>
      )}
    </div>
  );
}
