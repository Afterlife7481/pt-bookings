"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { LocationRow } from "../types";

export function LocationsSection({ onChanged }: { onChanged?: () => void }) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    try {
      const data = await fetchJson<LocationRow[]>("/api/locations");
      setLocations(data);
    } catch {
      // Keep existing list on refresh failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await fetchJson("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      setName("");
      setAddress("");
      await loadLocations();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add location");
    } finally {
      setAdding(false);
    }
  }

  function startEditing(location: LocationRow) {
    setEditingId(location.id);
    setEditName(location.name);
    setEditAddress(location.address ?? "");
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditAddress("");
  }

  async function saveLocation(id: string) {
    setSavingId(id);
    setError(null);
    try {
      await fetchJson(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, address: editAddress }),
      });
      cancelEditing();
      await loadLocations();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update location");
    } finally {
      setSavingId(null);
    }
  }

  async function removeLocation(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await fetchJson(`/api/locations/${id}`, { method: "DELETE" });
      await loadLocations();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete location");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Locations</h2>
      <p className="mt-1 text-sm text-slate-600">
        Places where you train. Assign which locations each client can use from
        their profile page.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading locations…</p>
      ) : locations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No locations yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {locations.map((location) => (
            <li
              key={location.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              {editingId === location.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveLocation(location.id);
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
                  <label className="flex min-w-[12rem] flex-[2] flex-col gap-1">
                    <span className="text-xs text-slate-500">Address</span>
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-1.5"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="px-3 py-1.5 text-xs"
                      disabled={savingId === location.id}
                    >
                      {savingId === location.id ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      disabled={savingId === location.id}
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{location.name}</p>
                    {location.address && (
                      <p className="text-slate-500">{location.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900 disabled:opacity-50"
                      disabled={deletingId === location.id || savingId !== null}
                      onClick={() => startEditing(location)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                      disabled={deletingId === location.id || savingId !== null}
                      onClick={() => removeLocation(location.id)}
                    >
                      {deletingId === location.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addLocation} className="mt-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">New location</span>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main gym, Home studio"
              required
            />
          </label>
          <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-sm">
            <span className="text-slate-600">Address</span>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional — street, city, postcode"
            />
          </label>
          <Button type="submit" disabled={adding}>
            {adding ? "Adding…" : "Add location"}
          </Button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
