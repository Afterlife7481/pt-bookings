import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { listClients, createClient } from "@/lib/services/clients";
import { sessionPriceFromBody } from "@/lib/validation/client";

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

  if (!body.name?.trim() || !body.phone?.trim()) {
    return Response.json({ error: "Name and phone are required" }, { status: 400 });
  }

  try {
    const id = await createClient({
      trainerId,
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim(),
      lastMinuteOptIn: body.lastMinuteOptIn ?? false,
      sessionPrice: sessionPriceFromBody(body.sessionPrice),
    });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create client";
    return Response.json({ error: message }, { status: 400 });
  }
}
