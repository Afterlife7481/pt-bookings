import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import { ClientPageLayout } from "@/components/client/client-ui";
import { LastMinutePreferencesForm } from "@/components/LastMinutePreferencesForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientLastMinutePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  return (
    <main className="p-4 sm:p-6">
      <ClientPageLayout
        title="Last-minute openings"
        description="Tap open slots to opt in for last-minute offers. Only session times from your trainer's template at your available locations are shown. If your trainer updates their template, some selections may be removed."
        backHref={`/c/${token}`}
      >
        <LastMinutePreferencesForm clientToken={token} showHeader={false} />
      </ClientPageLayout>
    </main>
  );
}
