import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  listTemplates,
  createTemplate,
  applyTemplateToWeek,
} from "@/lib/services/templates";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const templates = await listTemplates(trainerId);
  return Response.json({ templates });
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  if (body.action === "apply") {
    try {
      const result = await applyTemplateToWeek(
        body.templateId,
        body.weekStart,
        trainerId,
      );
      return Response.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to apply template";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  try {
    const id = await createTemplate(body.name, body.slots ?? [], trainerId);
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create template";
    return Response.json({ error: message }, { status: 400 });
  }
}
