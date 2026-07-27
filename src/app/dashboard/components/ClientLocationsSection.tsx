"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  ClientDetail,
  ClientLocationOption,
} from "../clients/[id]/client-types";

export function ClientLocationsSection({
  clientId,
  showHeading = true,
}: {
  clientId: string;
  showHeading?: boolean;
}) {
  const [locations, setLocations] = useState<ClientLocationOption[]>([]);
  const [enabledLocationIds, setEnabledLocationIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (!res.ok) {
      setLoading(false);
      setError("Failed to load locations");
      return;
    }
    const data: ClientDetail = await res.json();
    setLocations(data.locations);
    setEnabledLocationIds(
      new Set(data.locations.filter((l) => l.enabled).map((l) => l.id)),
    );
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleLocation(locationId: string, enabled: boolean) {
    const previous = enabledLocationIds;
    const next = new Set(enabledLocationIds);
    if (enabled) next.add(locationId);
    else next.delete(locationId);
    setEnabledLocationIds(next);

    setSaving(true);
    setError(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationIds: [...next] }),
    });
    const data = (await res.json()) as ClientDetail | { error?: string };
    setSaving(false);

    if (!res.ok) {
      setError(
        "error" in data
          ? (data.error ?? "Failed to save locations")
          : "Failed to save locations",
      );
      setEnabledLocationIds(previous);
      return;
    }

    const detail = data as ClientDetail;
    setLocations(detail.locations);
    setEnabledLocationIds(
      new Set(detail.locations.filter((l) => l.enabled).map((l) => l.id)),
    );
  }

  return (
    <div>
      {showHeading ? <h2 className="font-semibold">Locations</h2> : null}
      <p
        className={
          showHeading ? "mt-1 text-sm text-slate-600" : "text-sm text-slate-600"
        }
      >
        Choose which of your training locations are available for this client.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading locations…</p>
      ) : locations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No locations yet. Add locations in the{" "}
          <Link
            href="/dashboard/settings/locations"
            className="text-blue-600 underline"
          >
            Settings
          </Link>{" "}
          tab on the dashboard.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {locations.map((location) => (
            <li key={location.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabledLocationIds.has(location.id)}
                  disabled={saving}
                  onChange={(e) =>
                    toggleLocation(location.id, e.target.checked)
                  }
                />
                <span>{location.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saving && (
        <p className="mt-3 text-sm text-slate-500">Saving locations…</p>
      )}
    </div>
  );
}
