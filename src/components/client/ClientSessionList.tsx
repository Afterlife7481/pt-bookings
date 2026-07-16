import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatSlot } from "@/lib/utils";

export type ClientSessionListItem = {
  bookingToken: string;
  status: string;
  isRecurring: boolean;
  startAt: string;
  endAt: string | null;
};

export function ClientSessionList({
  sessions,
  emptyMessage,
}: {
  sessions: ClientSessionListItem[];
  emptyMessage: string;
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map((session) => (
        <li key={session.bookingToken}>
          <Link
            href={`/s/${session.bookingToken}`}
            className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {formatSlot(session.startAt, session.endAt)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {session.status === "canceled" ? (
                  <Badge tone="danger">Canceled</Badge>
                ) : session.status === "voided" ? (
                  <Badge tone="danger">Voided</Badge>
                ) : session.status === "pending_change" ? (
                  <Badge tone="warning">Changing</Badge>
                ) : null}
                {session.status !== "voided" &&
                  (session.isRecurring ? (
                    <Badge tone="success">Recurring</Badge>
                  ) : (
                    <Badge>Manual</Badge>
                  ))}
              </div>
            </div>
            <span className="text-sm text-slate-400">View →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
