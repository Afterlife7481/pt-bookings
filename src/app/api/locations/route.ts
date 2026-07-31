import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
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
    const location = await createLocation(trainerId, {
      name: body.name ?? "",
      address: body.address,
    });
    return Response.json(location, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Failed to create location");
  }
}
