import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { cancelBookingByToken } from "@/lib/services/bookings";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const limited = await enforceRateLimit(ip, {
    scope: "client-cancel:ip",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const body = await request.json();
  const bookingToken =
    typeof body.bookingToken === "string" ? body.bookingToken.trim() : "";

  if (!bookingToken) {
    return Response.json({ error: "bookingToken is required" }, { status: 400 });
  }

  try {
    const result = await cancelBookingByToken(bookingToken);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e, "Failed to cancel booking");
  }
}
