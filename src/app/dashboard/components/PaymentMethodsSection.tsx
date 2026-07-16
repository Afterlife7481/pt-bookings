"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";

type PaymentMethodRow = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export function PaymentMethodsSection({
  onChanged,
  embedded = false,
}: {
  onChanged?: () => void;
  embedded?: boolean;
}) {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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
        body: JSON.stringify({ name }),
      });
      setName("");
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
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  async function saveMethod(id: string) {
    setSavingId(id);
    setError(null);
    try {
      await fetchJson(`/api/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
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

  const body = (
    <>
      {loading ? (
        <p className="text-sm text-slate-500">Loading payment methods…</p>
      ) : methods.length === 0 ? (
        <p className="text-sm text-slate-500">No payment methods yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {methods.map((method) => (
            <li
              key={method.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              {editingId === method.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveMethod(method.id);
                  }}
                >
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                    <span className="text-xs text-slate-500">Name</span>
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-1.5"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      autoFocus
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
                <>
                  <p className="min-w-0 flex-1 font-medium">{method.name}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900 disabled:opacity-50"
                      disabled={deletingId === method.id || savingId !== null}
                      onClick={() => startEditing(method)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                      disabled={
                        deletingId === method.id ||
                        savingId !== null ||
                        methods.length <= 1
                      }
                      onClick={() => void removeMethod(method.id)}
                    >
                      {deletingId === method.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => void addMethod(e)}
        className="mt-6 space-y-3 border-t border-slate-100 pt-6"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">New payment method</span>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Revolut, Card"
              required
            />
          </label>
          <Button type="submit" disabled={adding}>
            {adding ? "Adding…" : "Add method"}
          </Button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card>
      <h2 className="font-semibold">Payment methods</h2>
      <p className="mt-1 text-sm text-slate-600">
        Options you can choose when marking a session as paid. Defaults are
        Cash, Transfer, and Monzo.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Editing or deleting a method only changes this list. Past paid sessions
        keep the method name that was saved at the time.
      </p>
      <div className="mt-4">{body}</div>
    </Card>
  );
}
