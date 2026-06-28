import { ensureDb } from "@/lib/db/init";
import { acceptLastMinuteOffer } from "@/lib/services/last-minute";
import { Card } from "@/components/ui";
import { formatSlot } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InterestClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ slotId?: string; clientId?: string }>;
}) {
  await ensureDb();
  const { slotId, clientId } = await searchParams;

  if (!slotId || !clientId) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">Invalid offer link.</p>
        </Card>
      </main>
    );
  }

  try {
    const result = await acceptLastMinuteOffer(slotId, clientId);
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <h1 className="text-xl font-semibold">Session booked</h1>
          <p className="mt-2 text-slate-600">
            Your session for {formatSlot(result.slot!.startAt)} is confirmed.
            Check WhatsApp for details.
          </p>
        </Card>
      </main>
    );
  } catch (e) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">
            {e instanceof Error ? e.message : "Something went wrong"}
          </p>
        </Card>
      </main>
    );
  }
}
