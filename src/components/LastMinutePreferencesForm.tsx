"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { LastMinutePreferenceCell } from "@/components/LastMinutePreferenceCell";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";
import { formatTimeRange } from "@/lib/constants";
import {
  dayOfWeekLabel,
  recurringSlotKey,
  slotCoversGridRow,
  slotGridRowSpan,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";

type Preference = { dayOfWeek: number; startTime: string };

type TemplateSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
};

type EnabledLocation = { id: string; name: string };

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

function templateSlotAtRow(
  templateSlots: TemplateSlot[],
  dayOfWeek: number,
  rowTime: string,
) {
  const slot =
    templateSlots.find(
      (s) =>
        s.dayOfWeek === dayOfWeek &&
        slotCoversGridRow(s.startTime, s.endTime, rowTime),
    ) ?? null;

  if (!slot) return null;

  return {
    slot,
    isStart: slot.startTime === rowTime,
  };
}

export function LastMinutePreferencesForm({
  clientToken,
}: {
  clientToken: string;
}) {
  const [optIn, setOptIn] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [templateSlots, setTemplateSlots] = useState<TemplateSlot[]>([]);
  const [enabledLocations, setEnabledLocations] = useState<EnabledLocation[]>(
    [],
  );
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
        templateSlots: TemplateSlot[];
        enabledLocations: EnabledLocation[];
      } = await res.json();
      const keys = new Set(
        data.preferences.map((p) => recurringSlotKey(p.dayOfWeek, p.startTime)),
      );
      setOptIn(data.optIn);
      setSelectedKeys(keys);
      savedSignatureRef.current = keysSignature(keys);
      setScheduleStartTime(data.scheduleStartTime);
      setScheduleEndTime(data.scheduleEndTime);
      setTemplateSlots(data.templateSlots ?? []);
      setEnabledLocations(data.enabledLocations ?? []);
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

  const timeRows = useMemo(
    () => timeRowsInScheduleRange(scheduleStartTime, scheduleEndTime),
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

  function toggleSlot(dayOfWeek: number, startTime: string) {
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

  const hasAvailableSlots = templateSlots.length > 0;
  const locationSummary =
    enabledLocations.length > 0
      ? enabledLocations.map((loc) => loc.name).join(", ")
      : null;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">Last-minute openings</p>
          <p className="text-sm text-slate-600">
            Tap open slots to opt in for last-minute offers. Only session times
            from your trainer&apos;s template at your available locations are
            shown.
          </p>
          {locationSummary && (
            <p className="mt-1 text-sm text-slate-500">
              Your locations:{" "}
              <span className="font-medium text-slate-700">{locationSummary}</span>
            </p>
          )}
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
          {!hasAvailableSlots ? (
            <p className="text-sm text-amber-800">
              {enabledLocations.length === 0
                ? "Your trainer has not enabled any locations for you yet, so there are no session times to choose from."
                : "Your trainer has not set up matching template slots at your locations yet."}
            </p>
          ) : (
            <>
              <WeeklyHourGrid
                timeRows={timeRows}
                variant="full"
                compactRowSize="1.375rem"
                dayColMin="5.5rem"
                className="w-full"
                getDayHeader={(day) => ({ primary: day.label })}
                renderCell={(dayOfWeek, rowTime) => {
                  const match = templateSlotAtRow(
                    templateSlots,
                    dayOfWeek,
                    rowTime,
                  );

                  if (!match) {
                    return <div className="h-full bg-white" />;
                  }

                  if (!match.isStart) {
                    return { covered: true };
                  }

                  const { slot } = match;
                  const selected = selectedKeys.has(
                    recurringSlotKey(dayOfWeek, slot.startTime),
                  );
                  const label = formatTimeRange(slot.startTime, slot.endTime);

                  return {
                    rowSpan: slotGridRowSpan(slot.startTime, slot.endTime),
                    content: (
                      <LastMinutePreferenceCell
                        locationName={slot.locationName}
                        selected={selected}
                        disabled={saveStatus === "saving"}
                        onToggle={() => toggleSlot(dayOfWeek, slot.startTime)}
                        title={`${dayOfWeekLabel(dayOfWeek)} ${label} · ${slot.locationName}`}
                      />
                    ),
                  };
                }}
              />

              <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-green-200 bg-green-50" />
                  Available to opt in
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-blue-200 bg-blue-50" />
                  Opted in
                </span>
              </div>
            </>
          )}

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
          disabled={saveStatus === "saving" || !hasAvailableSlots}
          onClick={() => setOptIn(true)}
        >
          Opt in
        </Button>
      )}

      {!hasAvailableSlots && !optIn && (
        <p className="text-sm text-amber-800">
          {enabledLocations.length === 0
            ? "Ask your trainer to enable locations for you before opting in."
            : "Your trainer needs template slots at your locations before you can opt in."}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
