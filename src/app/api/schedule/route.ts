import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { defaultWeekStart } from "@/lib/schedule-utils";
import { getWeekSchedule } from "@/lib/services/schedule";

export async function GET(request: Request) {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart") ?? defaultWeekStart();
  const schedule = await getWeekSchedule(DEFAULT_TRAINER_ID, weekStart);
  return Response.json(schedule);
}
