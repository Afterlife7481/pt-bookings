import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { listWhatsAppLog } from "@/lib/whatsapp";

export async function GET() {
  await ensureDb();
  const messages = await listWhatsAppLog(DEFAULT_TRAINER_ID);
  return Response.json(messages);
}
