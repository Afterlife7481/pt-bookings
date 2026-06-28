import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { getRecurringSlotAssignments } from "@/lib/services/clients";
import { getTrainerSettings } from "@/lib/services/settings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const [assignments, settings] = await Promise.all([
    getRecurringSlotAssignments(trainerId, id),
    getTrainerSettings(trainerId),
  ]);
  return Response.json({
    assignments,
    scheduleStartTime: settings.scheduleStartTime,
    scheduleEndTime: settings.scheduleEndTime,
  });
}
