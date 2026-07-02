import { nanoid } from "nanoid";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientNotes } from "@/lib/db/schema";
import type { ClientNoteVisibility } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";
import { getClientForTrainer } from "./clients";

const MAX_NOTE_LENGTH = 5000;

export type ClientNoteDto = {
  id: string;
  visibility: ClientNoteVisibility;
  body: string;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: {
  id: string;
  visibility: ClientNoteVisibility;
  body: string;
  createdAt: string;
  updatedAt: string;
}): ClientNoteDto {
  return {
    id: row.id,
    visibility: row.visibility,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeVisibility(value: unknown): ClientNoteVisibility {
  if (value === "shared" || value === "private") return value;
  throw new Error("Visibility must be 'shared' or 'private'");
}

function normalizeBody(value: unknown): string {
  if (typeof value !== "string") throw new Error("Note body is required");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Note body is required");
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new Error(`Note must be ${MAX_NOTE_LENGTH} characters or fewer`);
  }
  return trimmed;
}

/** All notes for a client the trainer owns (both shared and private). */
export async function listClientNotesForTrainer(
  trainerId: string,
  clientId: string,
): Promise<ClientNoteDto[]> {
  const client = await getClientForTrainer(trainerId, clientId);
  if (!client) throw new Error("Client not found");

  const db = getDb();
  const rows = await db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.clientId, clientId))
    .orderBy(asc(clientNotes.createdAt));

  return rows.map(toDto);
}

export async function createClientNote(
  trainerId: string,
  clientId: string,
  params: { visibility: unknown; body: unknown },
): Promise<ClientNoteDto> {
  const client = await getClientForTrainer(trainerId, clientId);
  if (!client) throw new Error("Client not found");

  const visibility = normalizeVisibility(params.visibility);
  const body = normalizeBody(params.body);

  const db = getDb();
  const ts = nowIso();
  const id = nanoid();
  await db.insert(clientNotes).values({
    id,
    trainerId,
    clientId,
    visibility,
    body,
    createdAt: ts,
    updatedAt: ts,
  });

  return { id, visibility, body, createdAt: ts, updatedAt: ts };
}

async function getNoteForTrainer(trainerId: string, noteId: string) {
  const db = getDb();
  return db.query.clientNotes.findFirst({
    where: and(eq(clientNotes.id, noteId), eq(clientNotes.trainerId, trainerId)),
  });
}

export async function updateClientNote(
  trainerId: string,
  noteId: string,
  updates: { visibility?: unknown; body?: unknown },
): Promise<ClientNoteDto> {
  const note = await getNoteForTrainer(trainerId, noteId);
  if (!note) throw new Error("Note not found");

  const patch: {
    visibility?: ClientNoteVisibility;
    body?: string;
    updatedAt: string;
  } = { updatedAt: nowIso() };

  if (updates.visibility !== undefined) {
    patch.visibility = normalizeVisibility(updates.visibility);
  }
  if (updates.body !== undefined) {
    patch.body = normalizeBody(updates.body);
  }

  const db = getDb();
  await db.update(clientNotes).set(patch).where(eq(clientNotes.id, noteId));

  return toDto({ ...note, ...patch });
}

export async function deleteClientNote(trainerId: string, noteId: string) {
  const note = await getNoteForTrainer(trainerId, noteId);
  if (!note) throw new Error("Note not found");

  const db = getDb();
  await db.delete(clientNotes).where(eq(clientNotes.id, noteId));
}

/**
 * Shared notes for the client-facing portal. Filters to `shared` in the query
 * so private notes never leave the server on the client path.
 */
export async function getSharedNotesForClient(
  clientId: string,
): Promise<ClientNoteDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clientNotes)
    .where(
      and(
        eq(clientNotes.clientId, clientId),
        eq(clientNotes.visibility, "shared"),
      ),
    )
    .orderBy(asc(clientNotes.createdAt));

  return rows.map(toDto);
}
