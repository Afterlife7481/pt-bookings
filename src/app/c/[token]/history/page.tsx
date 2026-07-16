import { ensureDb } from "@/lib/db/init";
import { listClientSessions } from "@/lib/services/bookings";
import { getClientByToken } from "@/lib/services/clients";
import { ClientSessionList } from "@/components/client/ClientSessionList";
import { ClientInset, ClientPageLayout } from "@/components/client/client-ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientHistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  const { history } = await listClientSessions(client.id);

  return (
    <main className="p-4 sm:p-6">
      <ClientPageLayout
        title="Session history"
        description="Past sessions, including canceled and completed bookings."
        backHref={`/c/${token}`}
      >
        <ClientInset>
          <ClientSessionList
            sessions={history}
            emptyMessage="No past sessions yet."
          />
        </ClientInset>
      </ClientPageLayout>
    </main>
  );
}
