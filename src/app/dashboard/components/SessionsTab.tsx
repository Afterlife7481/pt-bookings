"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatSlot } from "@/lib/utils";
import type { BookingRow } from "../types";

export function SessionsTab({ bookings }: { bookings: BookingRow[] }) {
  const sorted = [...bookings].sort((a, b) =>
    a.slot.startAt.localeCompare(b.slot.startAt),
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold">Sessions</h2>
        <p className="text-sm text-slate-500">{sorted.length} upcoming</p>
      </div>

      {sorted.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          No upcoming sessions. Apply a template first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((row) => (
                <tr key={row.booking.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/clients/${row.client.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {row.client.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatSlot(row.slot.startAt)}
                  </td>
                  <td className="px-4 py-3">
                    {row.booking.status === "confirmed" ? (
                      <Badge tone="success">Confirmed</Badge>
                    ) : row.booking.status === "pending_change" ? (
                      <Badge tone="warning">Changing</Badge>
                    ) : (
                      <Badge>{row.booking.status}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
