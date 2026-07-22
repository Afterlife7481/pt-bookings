import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { notifyClientOfScheduleConflict } from "@/lib/services/template-conflicts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await notifyClientOfScheduleConflict(
      id,
      trainerId,
      body.channels,
    );
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to notify client";
    return Response.json({ error: message }, { status: 400 });
  }
}
