import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
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
    return errorResponse(e, "Failed to update note");
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
    return errorResponse(e, "Failed to delete note");
  }
}
