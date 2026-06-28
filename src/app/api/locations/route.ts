import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  listLocations,
  createLocation,
} from "@/lib/services/locations";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const rows = await listLocations(trainerId);
  return Response.json(rows);
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    const location = await createLocation(trainerId, body.name ?? "");
    return Response.json(location, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create location";
    return Response.json({ error: message }, { status: 400 });
  }
}
