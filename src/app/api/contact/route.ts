import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { submitTrainerContact } from "@/lib/services/contact";
import type { TrainerContactKind } from "@/lib/contact";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

function parseKind(value: unknown): TrainerContactKind | null {
  if (value === "feature_request" || value === "feedback") return value;
  return null;
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const ip = getRequestIp(request);
  const ipLimited = await enforceRateLimit(ip, {
    scope: "contact:ip",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (ipLimited) return ipLimited;

  const trainerLimited = await enforceRateLimit(trainerId, {
    scope: "contact:trainer",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (trainerLimited) return trainerLimited;

  const body = await request.json();
  const kind = parseKind(body.kind);
  if (!kind) {
    return Response.json({ error: "Invalid contact type" }, { status: 400 });
  }

  try {
    await submitTrainerContact({
      trainerId,
      kind,
      message: typeof body.message === "string" ? body.message : "",
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Failed to send message");
  }
}
