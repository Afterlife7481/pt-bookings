import { ensureDb } from "@/lib/db/init";
import { expressInterest } from "@/lib/services/last-minute";
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
          <p className="text-red-600">Invalid interest link.</p>
        </Card>
      </main>
    );
  }

  try {
    const result = await expressInterest(slotId, clientId);
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <h1 className="text-xl font-semibold">
            {result.alreadyRegistered
              ? "Already registered"
              : "Interest registered"}
          </h1>
          <p className="mt-2 text-slate-600">
            {result.alreadyRegistered
              ? "You have already expressed interest in this slot."
              : `Your trainer will be notified of your interest in ${formatSlot(result.slot!.startAt)}.`}
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
