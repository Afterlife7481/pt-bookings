import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import {
  getTrainerSettings,
  updateTrainerSettings,
} from "@/lib/services/settings";

export async function GET() {
  await ensureDb();
  const settings = await getTrainerSettings(DEFAULT_TRAINER_ID);
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  await ensureDb();
  const body = await request.json();

  try {
    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      scheduleStartTime: body.scheduleStartTime,
      scheduleEndTime: body.scheduleEndTime,
      timezone: body.timezone,
      cancelDeadlineHours:
        body.cancelDeadlineHours !== undefined
          ? Number(body.cancelDeadlineHours)
          : undefined,
    });
    const settings = await getTrainerSettings(DEFAULT_TRAINER_ID);
    return Response.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save settings";
    return Response.json({ error: message }, { status: 400 });
  }
}
