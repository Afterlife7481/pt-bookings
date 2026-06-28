import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { listWhatsAppLog } from "@/lib/whatsapp";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const messages = await listWhatsAppLog(trainerId);
  return Response.json(messages);
}
