import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  createClientNote,
  listClientNotesForTrainer,
} from "@/lib/services/notes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  try {
    const notes = await listClientNotesForTrainer(trainerId, id);
    return Response.json({ notes });
  } catch (e) {
    return errorResponse(e, "Failed to load notes");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  try {
    const note = await createClientNote(trainerId, id, {
      visibility: body.visibility,
      body: body.body,
    });
    return Response.json(note, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Failed to create note");
  }
}
