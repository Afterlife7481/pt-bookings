import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { deleteClientNote, updateClientNote } from "@/lib/services/notes";

type RouteContext = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { noteId } = await params;
  const body = await request.json();

  try {
    const note = await updateClientNote(trainerId, noteId, {
      ...("visibility" in body && { visibility: body.visibility }),
      ...("body" in body && { body: body.body }),
    });
    return Response.json(note);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update note";
    const status = message === "Note not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { noteId } = await params;

  try {
    await deleteClientNote(trainerId, noteId);
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete note";
    const status = message === "Note not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
