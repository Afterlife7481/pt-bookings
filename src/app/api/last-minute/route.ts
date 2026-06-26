import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import {
  listOpenLastMinuteSlots,
  assignLastMinuteSlot,
} from "@/lib/services/last-minute";

export async function GET() {
  await ensureDb();
  const slots = await listOpenLastMinuteSlots(DEFAULT_TRAINER_ID);
  return Response.json(slots);
}

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();
  await assignLastMinuteSlot(body.slotId, body.clientId, DEFAULT_TRAINER_ID);
  return Response.json({ ok: true });
}
