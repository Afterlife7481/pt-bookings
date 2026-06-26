import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { listClients, createClient } from "@/lib/services/clients";

export async function GET() {
  await ensureDb();
  const clients = await listClients(DEFAULT_TRAINER_ID);
  return Response.json(clients);
}

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();

  if (!body.name?.trim() || !body.phone?.trim()) {
    return Response.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const id = await createClient({
    trainerId: DEFAULT_TRAINER_ID,
    name: body.name.trim(),
    phone: body.phone.trim(),
    lastMinuteOptIn: body.lastMinuteOptIn ?? false,
  });
  return Response.json({ id }, { status: 201 });
}
