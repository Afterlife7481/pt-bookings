import Link from "next/link";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Legacy `/interest/claim?slotId=&clientId=` links are no longer valid. */
export default function LegacyInterestClaimPage() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <Card className="space-y-3">
        <p className="text-red-600">
          This offer link is no longer valid. Ask your trainer to send a new
          last-minute offer.
        </p>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Home
        </Link>
      </Card>
    </main>
  );
}
