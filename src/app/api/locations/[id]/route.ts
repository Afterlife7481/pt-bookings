import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { deleteLocation, updateLocation } from "@/lib/services/locations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  try {
    const location = await updateLocation(trainerId, id, body.name ?? "");
    return Response.json(location);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update location";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;

  try {
    await deleteLocation(trainerId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete location";
    return Response.json({ error: message }, { status: 400 });
  }
}
