import { ensureDb } from "@/lib/db/init";
import { acceptLastMinuteOffer } from "@/lib/services/last-minute";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const limited = enforceRateLimit(ip, {
    scope: "client-last-minute-accept:ip",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const body = await request.json();
  const offerToken =
    typeof body.offerToken === "string" ? body.offerToken.trim() : "";

  if (!offerToken) {
    return Response.json({ error: "offerToken is required" }, { status: 400 });
  }

  try {
    const result = await acceptLastMinuteOffer(offerToken);
    return Response.json({ ok: true, token: result.booking.token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to accept offer";
    return Response.json({ error: message }, { status: 400 });
  }
}
