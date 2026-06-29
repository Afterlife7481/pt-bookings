import Link from "next/link";
import { ensureDb } from "@/lib/db/init";
import { getLastMinuteOfferPreview } from "@/lib/services/last-minute";
import { LastMinuteOfferClaim } from "@/components/LastMinuteOfferClaim";
import { Card } from "@/components/ui";

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

  const preview = await getLastMinuteOfferPreview(slotId, clientId);

  if (!preview) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">Offer not found.</p>
        </Card>
      </main>
    );
  }

  return (
    <LastMinuteOfferClaim
      slotId={slotId}
      clientId={clientId}
      preview={preview}
    />
  );
}
