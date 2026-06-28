import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  getLastMinuteWeekView,
  sendLastMinuteOffer,
} from "@/lib/services/last-minute";

export async function GET(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const weekStart = new URL(request.url).searchParams.get("weekStart");
  if (!weekStart) {
    return Response.json({ error: "weekStart is required" }, { status: 400 });
  }

  try {
    const data = await getLastMinuteWeekView(trainerId, weekStart);
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load last-minute week";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    const result = await sendLastMinuteOffer(
      trainerId,
      body.slotId,
      body.clientId,
    );
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send offer";
    return Response.json({ error: message }, { status: 400 });
  }
}
