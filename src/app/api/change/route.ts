import { ensureDb } from "@/lib/db/init";
import {
  startChangeRequest,
  confirmChange,
  abortChangeByBookingToken,
} from "@/lib/services/change";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const limited = enforceRateLimit(ip, {
    scope: "change:ip",
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const body = await request.json();

  try {
    if (body.action === "start") {
      const result = await startChangeRequest(body.bookingToken);
      return Response.json(result);
    }

    if (body.action === "confirm") {
      const result = await confirmChange(body.changeRequestId, body.toSlotId);
      return Response.json(result);
    }

    if (body.action === "abort") {
      await abortChangeByBookingToken(body.bookingToken);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return Response.json({ error: message }, { status: 400 });
  }
}
