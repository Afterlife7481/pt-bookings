"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { formatSessionPrice } from "@/lib/utils";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import type { DashboardClient } from "../types";

function formatRecurring(prefs: { dayOfWeek: number; startTime: string }[]) {
  if (prefs.length === 0) return "—";
  return prefs
    .map((p) => `${dayOfWeekLabel(p.dayOfWeek)} ${p.startTime}`)
    .join(", ");
}

export function ClientsTab({ clients }: { clients: DashboardClient[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-semibold">All clients</h2>
          <p className="text-sm text-slate-500">{clients.length} total</p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button>Add client</Button>
        </Link>
      </div>
      {clients.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No clients yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Session price</th>
                <th className="px-4 py-3 font-medium">Recurring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/clients/${c.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatSessionPrice(c.sessionPrice)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatRecurring(c.recurringPreferences)}
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
