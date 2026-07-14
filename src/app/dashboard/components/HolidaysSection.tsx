"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { SCHEDULE_TIME_INPUT_STEP_SECONDS } from "@/lib/constants";
import { formatHolidayRange } from "@/lib/holidays-utils";
import type { HolidayRow } from "../types";

function toDateTimeLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

export function HolidaysSection({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHolidays = useCallback(async () => {
    try {
      const data = await fetchJson<HolidayRow[]>("/api/holidays");
      setHolidays(data);
    } catch {
      // Keep existing list on refresh failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await fetchJson("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, startAt, endAt }),
      });
      setLabel("");
      setStartAt("");
      setEndAt("");
      await loadHolidays();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add time off");
    } finally {
      setAdding(false);
    }
  }

  function startEditing(holiday: HolidayRow) {
    setEditingId(holiday.id);
    setEditLabel(holiday.label ?? "");
    setEditStartAt(toDateTimeLocalInput(holiday.startAt));
    setEditEndAt(toDateTimeLocalInput(holiday.endAt));
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditLabel("");
    setEditStartAt("");
    setEditEndAt("");
  }

  async function saveHoliday(id: string) {
    setSavingId(id);
    setError(null);
    try {
      await fetchJson(`/api/holidays/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel,
          startAt: editStartAt,
          endAt: editEndAt,
        }),
      });
      cancelEditing();
      await loadHolidays();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update time off");
    } finally {
      setSavingId(null);
    }
  }

  async function removeHoliday(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await fetchJson(`/api/holidays/${id}`, { method: "DELETE" });
      await loadHolidays();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete time off");
    } finally {
      setDeletingId(null);
    }
  }

  const body = (
    <>
      {loading ? (
        <p className="text-sm text-slate-500">Loading time off…</p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-slate-500">No time off scheduled yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {holidays.map((holiday) => (
            <li
              key={holiday.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"
            >
              {editingId === holiday.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveHoliday(holiday.id);
                  }}
                >
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Label (optional)</span>
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-1.5"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="e.g. Summer holiday"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                      <span className="text-xs text-slate-500">Starts</span>
                      <input
                        type="datetime-local"
                        step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
                        className="rounded-lg border border-slate-300 px-3 py-1.5"
                        value={editStartAt}
                        onChange={(e) => setEditStartAt(e.target.value)}
                        required
                      />
                    </label>
                    <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                      <span className="text-xs text-slate-500">Ends</span>
                      <input
                        type="datetime-local"
                        step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
                        className="rounded-lg border border-slate-300 px-3 py-1.5"
                        value={editEndAt}
                        onChange={(e) => setEditEndAt(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="px-3 py-1.5 text-xs"
                      disabled={savingId === holiday.id}
                    >
                      {savingId === holiday.id ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      disabled={savingId === holiday.id}
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    {holiday.label ? (
                      <p className="font-medium">{holiday.label}</p>
                    ) : (
                      <p className="font-medium text-slate-700">Time off</p>
                    )}
                    <p className="text-slate-500">
                      {formatHolidayRange(holiday.startAt, holiday.endAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900 disabled:opacity-50"
                      disabled={deletingId === holiday.id || savingId !== null}
                      onClick={() => startEditing(holiday)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                      disabled={deletingId === holiday.id || savingId !== null}
                      onClick={() => removeHoliday(holiday.id)}
                    >
                      {deletingId === holiday.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addHoliday} className="mt-6 space-y-3 border-t border-slate-100 pt-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Label (optional)</span>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Bank holiday, clinic day"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">Starts</span>
            <input
              type="datetime-local"
              step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">Ends</span>
            <input
              type="datetime-local"
              step={SCHEDULE_TIME_INPUT_STEP_SECONDS}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
          </label>
          <Button type="submit" disabled={adding}>
            {adding ? "Adding…" : "Add time off"}
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
      <h2 className="font-semibold">Time off</h2>
      <p className="mt-1 text-sm text-slate-600">
        Block out periods when you cannot train. No slots can be created during
        these times.
      </p>
      <div className="mt-4">{body}</div>
    </Card>
  );
}
