import { ensureDb } from "@/lib/db/init";
import { listClientSessions } from "@/lib/services/bookings";
import { getClientByToken } from "@/lib/services/clients";
import { getSharedNotesForClient } from "@/lib/services/notes";
import { ClientSessionList } from "@/components/client/ClientSessionList";
import {
  ClientGroup,
  ClientInset,
  ClientRowLink,
} from "@/components/client/client-ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { formatCreatedDate } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  const [{ upcoming, history }, sharedNotes] = await Promise.all([
    listClientSessions(client.id),
    getSharedNotesForClient(client.id),
  ]);

  const historyDetail =
    history.length === 0
      ? undefined
      : `${history.length} past session${history.length === 1 ? "" : "s"}`;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="pt-1">
        <p className="text-sm text-slate-500">Home</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hi {client.name}
        </h1>
      </header>

      {sharedNotes.length > 0 && (
        <ClientInset>
          <h2 className="font-semibold text-slate-900">Notes from your trainer</h2>
          <ul className="mt-3 space-y-3">
            {sharedNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <LinkifiedText
                  text={note.body}
                  className="whitespace-pre-wrap text-sm text-slate-800"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Updated {formatCreatedDate(note.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        </ClientInset>
      )}

      <ClientInset>
        <h2 className="font-semibold text-slate-900">Upcoming sessions</h2>
        <div className="mt-3">
          <ClientSessionList
            sessions={upcoming}
            emptyMessage="No upcoming sessions booked."
          />
        </div>
      </ClientInset>

      <ClientGroup>
        <ClientRowLink
          href={`/c/${token}/book`}
          title="Book a session"
          subtitle="Choose from open slots in your booking window"
        />
        <ClientRowLink
          href={`/c/${token}/history`}
          title="Session history"
          detail={historyDetail}
        />
        <ClientRowLink
          href={`/c/${token}/last-minute`}
          title="Last-minute openings"
          subtitle="Get notified when a slot opens at short notice"
        />
      </ClientGroup>

      <ClientGroup>
        <ClientRowLink
          href={`/c/${token}/install`}
          title="Install on your phone"
          subtitle="Add the app to your home screen"
        />
      </ClientGroup>
    </main>
  );
}
