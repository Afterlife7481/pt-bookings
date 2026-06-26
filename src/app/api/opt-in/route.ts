import { ensureDb } from "@/lib/db/init";
import { updateClientLastMinuteOptIn } from "@/lib/services/clients";

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();
  await updateClientLastMinuteOptIn(body.clientId, body.optIn);
  return Response.json({ ok: true });
}
