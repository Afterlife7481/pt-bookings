import { ensureDb } from "@/lib/db/init";
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
    const message = e instanceof Error ? e.message : "Failed to load notes";
    return Response.json({ error: message }, { status: 404 });
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
    const message = e instanceof Error ? e.message : "Failed to create note";
    return Response.json({ error: message }, { status: 400 });
  }
}
