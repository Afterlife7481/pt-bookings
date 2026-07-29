"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { isProtectedPaymentMethod } from "@/lib/constants";

type PaymentMethodRow = {
  id: string;
  name: string;
  note: string | null;
  sortOrder: number;
  createdAt: string;
};

export function PaymentMethodsSection({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    try {
      const data = await fetchJson<PaymentMethodRow[]>("/api/payment-methods");
      setMethods(data);
    } catch {
      // Keep existing list on refresh failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await fetchJson("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note }),
      });
      setName("");
      setNote("");
      await loadMethods();
      onChanged?.();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to add payment method",
      );
    } finally {
      setAdding(false);
    }
  }

  function startEditing(method: PaymentMethodRow) {
    setEditingId(method.id);
    setEditName(method.name);
    setEditNote(method.note ?? "");
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditNote("");
  }

  async function saveMethod(id: string, protectedName: boolean) {
    setSavingId(id);
    setError(null);
    try {
      await fetchJson(`/api/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          protectedName
            ? { note: editNote }
            : { name: editName, note: editNote },
        ),
      });
      cancelEditing();
      await loadMethods();
      onChanged?.();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to update payment method",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function removeMethod(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await fetchJson(`/api/payment-methods/${id}`, { method: "DELETE" });
      await loadMethods();
      onChanged?.();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to delete payment method",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {loading ? (
        <p className="text-sm text-slate-500">Loading payment methods…</p>
      ) : (
        <ul className="space-y-3">
          {methods.map((method) => {
            const protectedMethod = isProtectedPaymentMethod(method.name);
            return (
              <li
                key={method.id}
                className="rounded-lg border border-slate-200 px-3 py-3 text-sm"
              >
                {editingId === method.id ? (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveMethod(method.id, protectedMethod);
                    }}
                  >
                    {protectedMethod ? (
                      <p className="font-medium text-slate-900">{method.name}</p>
                    ) : (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500">Name</span>
                        <input
                          className="rounded-lg border border-slate-300 px-3 py-1.5"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          autoFocus
                        />
                      </label>
                    )}
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500">
                        Details (optional)
                      </span>
                      <textarea
                        className="min-h-[5rem] rounded-lg border border-slate-300 px-3 py-2"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder={
                          method.name.toLowerCase() === "transfer"
                            ? "Pay to: …\nBank: …\nSort code: …\nAccount: …"
                            : "Extra details shown on payment requests"
                        }
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="px-3 py-1.5 text-xs"
                        disabled={savingId === method.id}
                      >
                        {savingId === method.id ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                        disabled={savingId === method.id}
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{method.name}</p>
                      {method.note ? (
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">
                          {method.note}
                        </p>
                      ) : (
                        <p className="mt-1 text-slate-400">No details yet</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900 disabled:opacity-50"
                        disabled={deletingId === method.id || savingId !== null}
                        onClick={() => startEditing(method)}
                      >
                        Edit
                      </button>
                      {!protectedMethod ? (
                        <button
                          type="button"
                          className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                          disabled={
                            deletingId === method.id || savingId !== null
                          }
                          onClick={() => void removeMethod(method.id)}
                        >
                          {deletingId === method.id ? "Removing…" : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => void addMethod(e)}
        className="mt-6 space-y-3 border-t border-slate-100 pt-6"
      >
        <p className="text-sm font-medium text-slate-900">Add another method</p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Name</span>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Revolut, Card"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Details (optional)</span>
          <textarea
            className="min-h-[4.5rem] rounded-lg border border-slate-300 px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Extra details shown on payment requests"
          />
        </label>
        <Button type="submit" disabled={adding}>
          {adding ? "Adding…" : "Add method"}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  );
}
