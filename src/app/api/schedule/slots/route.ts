import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import {
  addScheduleSlot,
  removeScheduleSlot,
} from "@/lib/services/schedule";

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();

  try {
    const result = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      body.weekStart,
      body.dayOfWeek,
      body.startTime,
    );
    return Response.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add slot";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get("slotId");
  if (!slotId) {
    return Response.json({ error: "slotId is required" }, { status: 400 });
  }

  try {
    await removeScheduleSlot(DEFAULT_TRAINER_ID, slotId);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to remove slot";
    return Response.json({ error: message }, { status: 400 });
  }
}
