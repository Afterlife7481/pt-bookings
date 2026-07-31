import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { sendPortalLinkForClient } from "@/lib/services/clients";

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
    const result = await sendPortalLinkForClient(
      trainerId,
      id,
      body.channels ?? ["whatsapp"],
    );
    return Response.json(result);
  } catch (e) {
    return errorResponse(e, "Failed to send portal link");
  }
}
