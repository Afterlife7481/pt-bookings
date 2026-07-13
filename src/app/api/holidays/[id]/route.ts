import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { deleteHoliday, updateHoliday } from "@/lib/services/holidays";

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
    const holiday = await updateHoliday(trainerId, id, {
      ...(body.startAt !== undefined && { startAt: body.startAt }),
      ...(body.endAt !== undefined && { endAt: body.endAt }),
      ...(body.label !== undefined && { label: body.label }),
    });
    return Response.json(holiday);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update time off";
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
    await deleteHoliday(trainerId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete time off";
    return Response.json({ error: message }, { status: 400 });
  }
}
