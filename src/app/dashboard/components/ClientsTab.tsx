"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { SessionWhen } from "@/components/SessionWhen";
import { parseLocalDateTime } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DashboardClient } from "../types";

type ClientsSort = "name" | "lastSession";

function ClientsSortToggle({
  value,
  onChange,
}: {
  value: ClientsSort;
  onChange: (sort: ClientsSort) => void;
}) {
  return (
    <div
      className="inline-flex w-fit shrink-0 self-start rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="tablist"
      aria-label="Sort clients"
    >
      {(
        [
          { value: "name", label: "A–Z" },
          { value: "lastSession", label: "Last session" },
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

function sortClients(clients: DashboardClient[], sort: ClientsSort): DashboardClient[] {
  const rows = [...clients];

  if (sort === "name") {
    return rows.sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  }

  return rows.sort((a, b) => {
    const aTime = a.lastSession
      ? parseLocalDateTime(a.lastSession.startAt).getTime()
      : null;
    const bTime = b.lastSession
      ? parseLocalDateTime(b.lastSession.startAt).getTime()
      : null;

    if (aTime === null && bTime === null) {
      return a.name.localeCompare(b.name, "en-GB");
    }
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    if (bTime !== aTime) return bTime - aTime;
    return a.name.localeCompare(b.name, "en-GB");
  });
}

export function ClientsTab({ clients }: { clients: DashboardClient[] }) {
  const [sort, setSort] = useState<ClientsSort>("name");
  const sortedClients = useMemo(() => sortClients(clients, sort), [clients, sort]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold">All clients</h2>
            <p className="text-sm text-slate-500">{clients.length} total</p>
          </div>
          <ClientsSortToggle value={sort} onChange={setSort} />
        </div>
        <Link href="/dashboard/clients/new">
          <Button>Add client</Button>
        </Link>
      </div>
      {clients.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No clients yet.</p>
      ) : (
        <table className="w-full min-w-0 table-fixed text-left text-sm">
          <colgroup>
            <col style={{ width: "44%" }} />
            <col style={{ width: "56%" }} />
          </colgroup>
          <tbody className="divide-y divide-slate-100">
            {sortedClients.map((c) => (
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
                  {c.lastSession ? (
                    <SessionWhen
                      startAt={c.lastSession.startAt}
                      endAt={c.lastSession.endAt}
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
