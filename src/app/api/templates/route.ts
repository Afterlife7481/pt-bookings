import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import {
  listTemplates,
  createTemplate,
  applyTemplateToWeek,
} from "@/lib/services/templates";

export async function GET() {
  await ensureDb();
  const templates = await listTemplates(DEFAULT_TRAINER_ID);
  return Response.json({ templates });
}

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();

  if (body.action === "apply") {
    try {
      const result = await applyTemplateToWeek(body.templateId, body.weekStart);
      return Response.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to apply template";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  const id = await createTemplate(
    body.name,
    body.slots,
    DEFAULT_TRAINER_ID,
  );
  return Response.json({ id }, { status: 201 });
}
