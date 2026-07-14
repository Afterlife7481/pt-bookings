import { ensureDb } from "@/lib/db/init";
import { getScheduleConflictPreview } from "@/lib/services/template-conflicts";
import { TemplateConflictAck } from "@/components/TemplateConflictAck";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ConflictAckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const conflictToken = token?.trim() ?? "";

  if (!conflictToken) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">Invalid link.</p>
        </Card>
      </main>
    );
  }

  const preview = await getScheduleConflictPreview(conflictToken);

  if (!preview) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <p className="text-red-600">Schedule notice not found.</p>
        </Card>
      </main>
    );
  }

  return (
    <TemplateConflictAck token={conflictToken} preview={preview} />
  );
}
