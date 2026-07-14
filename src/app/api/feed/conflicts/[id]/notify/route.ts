import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { notifyClientOfScheduleConflict } from "@/lib/services/template-conflicts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;

  try {
    await notifyClientOfScheduleConflict(id, trainerId);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to notify client";
    return Response.json({ error: message }, { status: 400 });
  }
}
