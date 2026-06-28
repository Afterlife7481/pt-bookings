import { ensureDb } from "@/lib/db/init";
import { bookSlotByClientToken } from "@/lib/services/bookings";
import { getClientByToken } from "@/lib/services/clients";
import { getAvailableSlotsForChange } from "@/lib/services/templates";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const limited = enforceRateLimit(ip, {
    scope: "client-book:ip",
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const clientToken = searchParams.get("clientToken");
  if (!clientToken) {
    return Response.json({ error: "clientToken is required" }, { status: 400 });
  }

  const client = await getClientByToken(clientToken);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const slots = await getAvailableSlotsForChange(
    client.trainerId,
    undefined,
    undefined,
    client.id,
  );
  return Response.json({ slots });
}

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const limited = enforceRateLimit(ip, {
    scope: "client-book:ip",
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const body = await request.json();

  try {
    const result = await bookSlotByClientToken(body.clientToken, body.slotId);
    return Response.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to book session";
    return Response.json({ error: message }, { status: 400 });
  }
}
