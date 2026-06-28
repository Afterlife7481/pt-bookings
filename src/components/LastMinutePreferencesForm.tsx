"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";
import {
  dayHeaderInitial,
  hourToStartTime,
  recurringSlotKey,
} from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";
import { hoursInScheduleRange } from "@/lib/constants";

type Preference = { dayOfWeek: number; startTime: string };

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function keysSignature(keys: Set<string>): string {
  return [...keys].sort().join("|");
}

function keysToPreferences(keys: Set<string>): Preference[] {
  return [...keys].map((key) => {
    const dash = key.indexOf("-");
    return {
      dayOfWeek: Number(key.slice(0, dash)),
      startTime: key.slice(dash + 1),
    };
  });
}

export function LastMinutePreferencesForm({
  clientToken,
}: {
  clientToken: string;
}) {
  const [optIn, setOptIn] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedKeysRef = useRef(selectedKeys);
  const savedSignatureRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  selectedKeysRef.current = selectedKeys;

  const isDirty =
    optIn && keysSignature(selectedKeys) !== savedSignatureRef.current;

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/opt-in?token=${encodeURIComponent(clientToken)}`,
      );
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data: {
        optIn: boolean;
        preferences: Preference[];
        scheduleStartTime: string;
        scheduleEndTime: string;
      } = await res.json();
      const keys = new Set(
        data.preferences.map((p) => recurringSlotKey(p.dayOfWeek, p.startTime)),
      );
      setOptIn(data.optIn);
      setSelectedKeys(keys);
      savedSignatureRef.current = keysSignature(keys);
      setScheduleStartTime(data.scheduleStartTime);
      setScheduleEndTime(data.scheduleEndTime);
      setLoading(false);
    }
    load();
  }, [clientToken]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (
        saveStatus === "pending" ||
        saveStatus === "saving" ||
        isDirty
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus, isDirty]);

  const hours = useMemo(
    () => hoursInScheduleRange(scheduleStartTime, scheduleEndTime),
    [scheduleStartTime, scheduleEndTime],
  );

  const persistPreferences = useCallback(
    async (keys: Set<string>) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      setSaveStatus("saving");
      setError(null);

      const preferences = keysToPreferences(keys);
      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: clientToken,
          optIn: preferences.length > 0,
          preferences,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveStatus("error");
        setError(data.error ?? "Failed to save");
        return false;
      }

      const savedKeys = new Set(
        (data.preferences as Preference[]).map((p) =>
          recurringSlotKey(p.dayOfWeek, p.startTime),
        ),
      );
      savedSignatureRef.current = keysSignature(savedKeys);
      setOptIn(data.optIn);
      if (!data.optIn) {
        setSelectedKeys(new Set());
        savedSignatureRef.current = "";
      }

      setSaveStatus("saved");
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
      savedFadeTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);

      return true;
    },
    [clientToken],
  );

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("pending");

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistPreferences(selectedKeysRef.current);
    }, 600);
  }, [persistPreferences]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (savedFadeTimerRef.current) {
        clearTimeout(savedFadeTimerRef.current);
      }

      const keys = selectedKeysRef.current;
      if (keysSignature(keys) === savedSignatureRef.current) return;

      const preferences = keysToPreferences(keys);
      fetch("/api/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: clientToken,
          optIn: preferences.length > 0,
          preferences,
        }),
        keepalive: true,
      });
    };
  }, [clientToken]);

  function toggleSlot(dayOfWeek: number, hour: number) {
    const startTime = hourToStartTime(hour);
    const key = recurringSlotKey(dayOfWeek, startTime);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    scheduleAutoSave();
  }

  async function optOut() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSelectedKeys(new Set());
    await persistPreferences(new Set());
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
        Loading last-minute preferences…
      </div>
    );
  }

  const statusMessage =
    saveStatus === "pending"
      ? "Saving soon…"
      : saveStatus === "saving"
        ? "Saving…"
        : saveStatus === "saved"
          ? "Preferences saved"
          : saveStatus === "error"
            ? null
            : optIn && selectedKeys.size > 0
              ? "Changes save automatically"
              : null;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">Last-minute openings</p>
          <p className="text-sm text-slate-600">
            Choose when you are usually free. Your trainer will manually offer
            you matching slots when something opens up.
          </p>
        </div>
        {statusMessage && (
          <p
            className={cn(
              "text-xs font-medium",
              saveStatus === "saved"
                ? "text-green-700"
                : saveStatus === "error"
                  ? "text-red-600"
                  : "text-slate-500",
            )}
          >
            {statusMessage}
          </p>
        )}
      </div>

      {optIn ? (
        <>
          <WeeklyHourGrid
            hours={hours}
            variant="compact"
            getDayHeader={dayHeaderInitial}
            renderCell={(dayOfWeek, hour) => {
              const startTime = hourToStartTime(hour);
              const selected = selectedKeys.has(
                recurringSlotKey(dayOfWeek, startTime),
              );
              return (
                <button
                  type="button"
                  onClick={() => toggleSlot(dayOfWeek, hour)}
                  title={startTime}
                  disabled={saveStatus === "saving"}
                  className={cn(
                    "h-10 w-full rounded border px-0.5 py-0.5 text-center transition",
                    selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50",
                    saveStatus === "saving" && "opacity-70",
                  )}
                >
                  <span className="block text-[9px] font-medium leading-tight">
                    {selected ? "✓" : null}
                  </span>
                </button>
              );
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={saveStatus === "saving"}
              onClick={() => optOut()}
            >
              Opt out
            </Button>
          </div>
        </>
      ) : (
        <Button
          disabled={saveStatus === "saving"}
          onClick={() => setOptIn(true)}
        >
          Opt in
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
