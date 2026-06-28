import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { defaultWeekStart } from "@/lib/schedule-utils";
import { getWeekSchedule } from "@/lib/services/schedule";

export async function GET(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart") ?? defaultWeekStart();
  const schedule = await getWeekSchedule(trainerId, weekStart);
  return Response.json(schedule);
}
