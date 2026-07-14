import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { listFeed } from "@/lib/services/feed";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const entries = await listFeed(trainerId);
  return Response.json(entries);
}
