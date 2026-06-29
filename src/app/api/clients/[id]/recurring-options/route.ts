import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { getRecurringSlotAssignments } from "@/lib/services/clients";
import { getTrainerSettings } from "@/lib/services/settings";
import {
  getTrainerTemplate,
  getTrainerTemplateOverlay,
} from "@/lib/services/templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const [assignments, settings, template, templateOverlay] = await Promise.all([
    getRecurringSlotAssignments(trainerId, id),
    getTrainerSettings(trainerId),
    getTrainerTemplate(trainerId),
    getTrainerTemplateOverlay(trainerId),
  ]);

  return Response.json({
    assignments,
    scheduleStartTime: settings.scheduleStartTime,
    scheduleEndTime: settings.scheduleEndTime,
    hasTemplate: template !== null,
    templateOverlay,
  });
}
