import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
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
    return errorResponse(e, "Failed to load invitations");
  }
}
