import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  isMessageTemplateKey,
  type MessageTemplateKey,
} from "@/lib/message-templates";
import {
  listMessageTemplatesForTrainer,
  resetMessageTemplate,
  upsertMessageTemplate,
} from "@/lib/services/message-templates";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const templates = await listMessageTemplatesForTrainer(trainerId);
  return Response.json({ templates });
}

export async function PATCH(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();
  const key = typeof body.key === "string" ? body.key : "";
  if (!isMessageTemplateKey(key)) {
    return Response.json({ error: "Unknown template" }, { status: 400 });
  }

  try {
    const template = await upsertMessageTemplate(
      trainerId,
      key as MessageTemplateKey,
      {
        subject: body.subject ?? null,
        body: typeof body.body === "string" ? body.body : "",
      },
    );
    return Response.json({ template });
  } catch (e) {
    return errorResponse(e, "Failed to save template");
  }
}

export async function DELETE(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!isMessageTemplateKey(key)) {
    return Response.json({ error: "Unknown template" }, { status: 400 });
  }

  try {
    const template = await resetMessageTemplate(
      trainerId,
      key as MessageTemplateKey,
    );
    return Response.json({ template });
  } catch (e) {
    return errorResponse(e, "Failed to reset template");
  }
}
