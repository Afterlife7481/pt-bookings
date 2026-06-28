import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  getTemplateForTrainer,
  updateTemplate,
} from "@/lib/services/templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const template = await getTemplateForTrainer(trainerId, id);
  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  return Response.json(template);
}

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
    await updateTemplate(trainerId, id, {
      name: body.name ?? "",
      slots: Array.isArray(body.slots) ? body.slots : [],
    });
    const template = await getTemplateForTrainer(trainerId, id);
    return Response.json(template);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update template";
    return Response.json({ error: message }, { status: 400 });
  }
}
