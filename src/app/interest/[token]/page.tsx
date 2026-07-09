import { ensureDb } from "@/lib/db/init";
import { getLastMinuteOfferPreview } from "@/lib/services/last-minute";
import { LastMinuteOfferClaim } from "@/components/LastMinuteOfferClaim";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InterestClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const offerToken = token?.trim() ?? "";

  if (!offerToken) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">Invalid offer link.</p>
        </Card>
      </main>
    );
  }

  const preview = await getLastMinuteOfferPreview(offerToken);

  if (!preview) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">Offer not found.</p>
        </Card>
      </main>
    );
  }

  return <LastMinuteOfferClaim offerToken={offerToken} preview={preview} />;
}
