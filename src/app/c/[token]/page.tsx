import Link from "next/link";
import { ensureDb } from "@/lib/db/init";
import { listClientSessions } from "@/lib/services/bookings";
import { getClientByToken } from "@/lib/services/clients";
import { Badge, Button, Card } from "@/components/ui";
import { formatSlot } from "@/lib/utils";
import { LastMinutePreferencesForm } from "@/components/LastMinutePreferencesForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function SessionList({
  sessions,
  emptyMessage,
}: {
  sessions: {
    bookingToken: string;
    status: string;
    isRecurring: boolean;
    startAt: string;
  }[];
  emptyMessage: string;
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {sessions.map((session) => (
        <li key={session.bookingToken}>
          <Link
            href={`/s/${session.bookingToken}`}
            className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {formatSlot(session.startAt)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {session.status === "canceled" ? (
                  <Badge tone="danger">Canceled</Badge>
                ) : session.status === "pending_change" ? (
                  <Badge tone="warning">Changing</Badge>
                ) : (
                  <Badge tone="success">Confirmed</Badge>
                )}
                {session.isRecurring && <Badge>Recurring</Badge>}
              </div>
            </div>
            <span className="text-sm text-slate-400">View →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ClientHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  const { upcoming, history } = await listClientSessions(client.id);

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <div>
        <p className="text-sm text-slate-500">Your sessions</p>
        <h1 className="text-2xl font-bold">Hi {client.name}</h1>
      </div>

      <Card>
        <h2 className="font-semibold">Upcoming sessions</h2>
        <div className="mt-3">
          <SessionList
            sessions={upcoming}
            emptyMessage="No upcoming sessions booked."
          />
        </div>
        <Link href={`/c/${token}/book`} className="mt-4 inline-block">
          <Button>Book a new session</Button>
        </Link>
      </Card>

      <Card>
        <h2 className="font-semibold">Session history</h2>
        <div className="mt-3">
          <SessionList
            sessions={history}
            emptyMessage="No past sessions yet."
          />
        </div>
      </Card>

      <LastMinutePreferencesForm clientToken={token} />
    </main>
  );
}
