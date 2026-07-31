import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
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
    return errorResponse(e, "Failed to load last-minute week");
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
      body.channels,
    );
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e, "Failed to send offer");
  }
}
