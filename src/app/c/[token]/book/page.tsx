import Link from "next/link";
import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import { getAvailableSlotsForChange } from "@/lib/services/templates";
import { getTrainerSettings } from "@/lib/services/settings";
import { BookSessionFlow } from "@/components/BookSessionFlow";
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

  const slots = await getAvailableSlotsForChange(client.trainerId, undefined, undefined, client.id);
  const { clientBookingWindowWeeks } = await getTrainerSettings(client.trainerId);

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <Link
        href={`/c/${token}`}
        className="inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to all sessions
      </Link>

      <BookSessionFlow
        clientToken={token}
        slots={slots}
        bookingWindowWeeks={clientBookingWindowWeeks}
      />
    </main>
  );
}
