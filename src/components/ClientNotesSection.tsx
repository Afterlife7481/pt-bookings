"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, InlineNotice } from "@/components/ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { formatCreatedDate } from "@/lib/utils";

type Visibility = "shared" | "private";

type ClientNote = {
  id: string;
  visibility: Visibility;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export function ClientNotesSection({
  clientId,
  visibility,
  showHeading = true,
}: {
  clientId: string;
  /** When set, only that visibility is shown and new notes use it. */
  visibility: Visibility;
  showHeading?: boolean;
}) {
  const isPrivate = visibility === "private";
  const title = isPrivate ? "Private notes" : "Public notes";
  const description = isPrivate
    ? "Only you can see these notes. They are never shown on the client portal."
    : "Visible to the client on their portal.";

  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(`/api/clients/${clientId}/notes`);
    if (!res.ok) {
      setLoading(false);
      setLoadError("Failed to load notes.");
      return;
    }
    const data: { notes: ClientNote[] } = await res.json();
    setNotes(data.notes.filter((n) => n.visibility === visibility));
    setLoading(false);
  }, [clientId, visibility]);

  useEffect(() => {
    load();
  }, [load]);

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim()) return;
    setCreating(true);
    setCreateError(null);
    const res = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newBody, visibility }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to add note");
      return;
    }
    setNewBody("");
    await load();
  }

  function startEdit(note: ClientNote) {
    setRowError(null);
    setEditingId(note.id);
    setEditBody(note.body);
  }

  async function saveEdit(noteId: string) {
    if (!editBody.trim()) return;
    setSavingEdit(true);
    setRowError(null);
    const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody, visibility }),
    });
    const data = await res.json();
    setSavingEdit(false);
    if (!res.ok) {
      setRowError(data.error ?? "Failed to save note");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function removeNote(noteId: string) {
    if (!window.confirm("Delete this note?")) return;
    setBusyId(noteId);
    setRowError(null);
    const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRowError(data.error ?? "Failed to delete note");
      return;
    }
    await load();
  }

  function renderNote(note: ClientNote) {
    if (editingId === note.id) {
      return (
        <li key={note.id} className="py-3">
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              className="px-3 py-1.5 text-xs"
              disabled={savingEdit}
              onClick={() => saveEdit(note.id)}
            >
              {savingEdit ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              disabled={savingEdit}
              onClick={() => setEditingId(null)}
            >
              Cancel
            </Button>
          </div>
        </li>
      );
    }

    return (
      <li key={note.id} className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <LinkifiedText
            text={note.body}
            className="whitespace-pre-wrap text-sm text-slate-800"
          />
          <p className="mt-1 text-xs text-slate-400">
            Updated {formatCreatedDate(note.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            className="px-2.5 py-1 text-xs"
            onClick={() => startEdit(note)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
            disabled={busyId === note.id}
            onClick={() => removeNote(note.id)}
          >
            {busyId === note.id ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <Card>
      {showHeading ? <h2 className="font-semibold">{title}</h2> : null}
      <p
        className={
          showHeading ? "mt-1 text-sm text-slate-600" : "text-sm text-slate-600"
        }
      >
        {description}
      </p>

      {loadError && (
        <InlineNotice tone="error" className="mt-4">
          {loadError}
        </InlineNotice>
      )}
      {rowError && (
        <InlineNotice tone="error" className="mt-4">
          {rowError}
        </InlineNotice>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">{notes.map(renderNote)}</ul>
      )}

      <form onSubmit={createNote} className="mt-6 border-t border-slate-100 pt-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Add a note</span>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={
              isPrivate
                ? "Private reminders, context, etc."
                : "Training instructions visible to the client…"
            }
          />
        </label>
        <div className="mt-2">
          <Button type="submit" disabled={creating || !newBody.trim()}>
            {creating ? "Adding…" : "Add note"}
          </Button>
        </div>
        {createError && (
          <InlineNotice tone="error" className="mt-3">
            {createError}
          </InlineNotice>
        )}
      </form>
    </Card>
  );
}
