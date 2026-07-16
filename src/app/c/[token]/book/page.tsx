import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import { getAvailableSlotsForChange } from "@/lib/services/available-slots";
import { getTrainerSettings } from "@/lib/services/settings";
import { BookSessionFlow } from "@/components/BookSessionFlow";
import { ClientPageLayout } from "@/components/client/client-ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientBookPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  const slots = await getAvailableSlotsForChange(
    client.trainerId,
    undefined,
    undefined,
    client.id,
  );
  const { clientBookingWindowWeeks } = await getTrainerSettings(client.trainerId);

  return (
    <main className="p-4 sm:p-6">
      <ClientPageLayout
        title="Book a session"
        description="Choose an open slot within your booking window."
        backHref={`/c/${token}`}
      >
        <BookSessionFlow
          clientToken={token}
          slots={slots}
          bookingWindowWeeks={clientBookingWindowWeeks}
          showHeader={false}
        />
      </ClientPageLayout>
    </main>
  );
}
