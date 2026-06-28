import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  addScheduleSlot,
  removeScheduleSlot,
  updateScheduleSlotLocation,
} from "@/lib/services/schedule";

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    const result = await addScheduleSlot(
      trainerId,
      body.weekStart,
      body.dayOfWeek,
      body.startTime,
      body.locationId,
    );
    return Response.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add slot";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    await updateScheduleSlotLocation(trainerId, body.slotId, body.locationId);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update slot";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get("slotId");
  if (!slotId) {
    return Response.json({ error: "slotId is required" }, { status: 400 });
  }

  try {
    await removeScheduleSlot(trainerId, slotId);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to remove slot";
    return Response.json({ error: message }, { status: 400 });
  }
}
