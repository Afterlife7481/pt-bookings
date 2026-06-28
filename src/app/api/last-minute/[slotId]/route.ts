import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { getEligibleClientsForSlot } from "@/lib/services/last-minute";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slotId: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { slotId } = await params;

  try {
    const detail = await getEligibleClientsForSlot(trainerId, slotId);
    return Response.json(detail);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load slot";
    return Response.json({ error: message }, { status: 400 });
  }
}
