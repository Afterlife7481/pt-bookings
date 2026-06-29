import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  getTrainerTemplate,
  saveTrainerTemplate,
  applyTrainerTemplateToWeek,
} from "@/lib/services/templates";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const template = await getTrainerTemplate(trainerId);
  return Response.json({ template });
}

export async function PATCH(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    await saveTrainerTemplate(
      trainerId,
      Array.isArray(body.slots) ? body.slots : [],
    );
    const template = await getTrainerTemplate(trainerId);
    return Response.json({ template });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save template";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  if (body.action === "apply") {
    try {
      const result = await applyTrainerTemplateToWeek(
        trainerId,
        body.weekStart,
      );
      return Response.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to apply template";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  return Response.json({ error: "Unsupported action" }, { status: 400 });
}
