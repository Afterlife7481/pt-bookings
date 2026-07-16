import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { getTrainerInvitations } from "@/lib/services/invites";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  try {
    const invitations = await getTrainerInvitations(trainerId);
    return Response.json(invitations);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load invitations";
    return Response.json({ error: message }, { status: 400 });
  }
}
