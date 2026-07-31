import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { listClients, createClient } from "@/lib/services/clients";
import { getTrainerSettings } from "@/lib/services/settings";
import { sessionPriceFromBody } from "@/lib/validation/client";
import { parsePreferredNotifyChannel } from "@/lib/notify-channels";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const clients = await listClients(trainerId);
  return Response.json(clients);
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const preferredNotifyChannel =
      body.preferredNotifyChannel !== undefined
        ? parsePreferredNotifyChannel(body.preferredNotifyChannel)
        : undefined;
    const settings = await getTrainerSettings(trainerId);

    const id = await createClient({
      trainerId,
      name: body.name.trim(),
      phone: typeof body.phone === "string" ? body.phone : "",
      email: body.email?.trim(),
      preferredNotifyChannel,
      lastMinuteOptIn: body.lastMinuteOptIn ?? false,
      sessionPrice: sessionPriceFromBody(body.sessionPrice, settings.currency),
    });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Failed to create client");
  }
}
