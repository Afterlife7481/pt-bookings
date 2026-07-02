"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, InlineNotice } from "@/components/ui";
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

export function ClientNotesSection({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newBody, setNewBody] = useState("");
  const [newVisibility, setNewVisibility] = useState<Visibility>("private");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editVisibility, setEditVisibility] = useState<Visibility>("private");
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
    setNotes(data.notes);
    setLoading(false);
  }, [clientId]);

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
      body: JSON.stringify({ body: newBody, visibility: newVisibility }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to add note");
      return;
    }
    setNewBody("");
    setNewVisibility("private");
    await load();
  }

  function startEdit(note: ClientNote) {
    setRowError(null);
    setEditingId(note.id);
    setEditBody(note.body);
    setEditVisibility(note.visibility);
  }

  async function saveEdit(noteId: string) {
    if (!editBody.trim()) return;
    setSavingEdit(true);
    setRowError(null);
    const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody, visibility: editVisibility }),
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

  const shared = notes.filter((n) => n.visibility === "shared");
  const priv = notes.filter((n) => n.visibility === "private");

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
            <select
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value as Visibility)}
            >
              <option value="private">Private (only you)</option>
              <option value="shared">Shared with client</option>
            </select>
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
      <h2 className="font-semibold">Notes</h2>
      <p className="mt-1 text-sm text-slate-600">
        Shared notes are visible to the client on their portal. Private notes are
        only ever seen by you.
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
      ) : (
        <div className="mt-4 space-y-6">
          <section>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Shared with client
              </h3>
              <Badge tone="success">Client can read</Badge>
            </div>
            {shared.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No shared notes yet.
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-slate-100">
                {shared.map(renderNote)}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-amber-900">
                Private (only you)
              </h3>
              <Badge tone="warning">Not visible to client</Badge>
            </div>
            {priv.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No private notes yet.
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-amber-100">
                {priv.map(renderNote)}
              </ul>
            )}
          </section>
        </div>
      )}

      <form onSubmit={createNote} className="mt-6 border-t border-slate-100 pt-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Add a note</span>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Training instructions, injury reminders, etc."
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={newVisibility}
            onChange={(e) => setNewVisibility(e.target.value as Visibility)}
          >
            <option value="private">Private (only you)</option>
            <option value="shared">Shared with client</option>
          </select>
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
