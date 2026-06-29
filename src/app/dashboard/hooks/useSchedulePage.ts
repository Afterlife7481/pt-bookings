import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { defaultWeekStart, shiftWeekStart } from "@/lib/schedule-utils";
import type { ScheduleEntry } from "@/lib/services/schedule";
import type {
  DashboardClient,
  TrainerLocation,
  TrainerSettings,
} from "../types";

export function useSchedulePage() {
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleRange, setScheduleRange] = useState({ weekStart: "", weekEnd: "" });
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [clients, setClients] = useState<DashboardClient[]>([]);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [trainerLocations, setTrainerLocations] = useState<TrainerLocation[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const activeWeek = weekStart || defaultWeekStart();
    const [c, t, sched, sett, locs] = await Promise.all([
      fetchJson<DashboardClient[]>("/api/clients"),
      fetchJson<{ template: unknown | null }>("/api/templates"),
      fetchJson<{
        entries: ScheduleEntry[];
        weekStart: string;
        weekEnd: string;
      }>(`/api/schedule?weekStart=${activeWeek}`),
      fetchJson<TrainerSettings>("/api/settings"),
      fetchJson<TrainerLocation[]>("/api/locations"),
    ]);
    setClients(c);
    setHasTemplate(t.template !== null);
    setScheduleEntries(sched.entries);
    setScheduleRange({ weekStart: sched.weekStart, weekEnd: sched.weekEnd });
    setSettings(sett);
    setTrainerLocations(Array.isArray(locs) ? locs : []);
  }, [weekStart]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  function changeWeek(delta: number) {
    setWeekStart((ws) => shiftWeekStart(ws || defaultWeekStart(), delta));
  }

  function goToThisWeek() {
    setWeekStart(defaultWeekStart());
  }

  async function runScheduleAction(action: () => Promise<void>) {
    setScheduleError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setScheduleError(e instanceof ApiError ? e.message : "Something went wrong");
    }
  }

  async function applyTemplateToCurrentWeek() {
    setApplyingTemplate(true);
    setScheduleError(null);
    try {
      await fetchJson("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          weekStart: scheduleRange.weekStart || weekStart,
        }),
      });
      await refresh();
      return true;
    } catch (e) {
      setScheduleError(
        e instanceof ApiError ? e.message : "Failed to apply template",
      );
      return false;
    } finally {
      setApplyingTemplate(false);
    }
  }

  async function addScheduleSlot(
    dayOfWeek: number,
    startTime: string,
    locationId: string,
  ) {
    await runScheduleAction(async () => {
      await fetchJson("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: scheduleRange.weekStart || weekStart,
          dayOfWeek,
          startTime,
          locationId,
        }),
      });
    });
  }

  async function updateScheduleSlotLocation(slotId: string, locationId: string) {
    await runScheduleAction(async () => {
      await fetchJson("/api/schedule/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, locationId }),
      });
    });
  }

  async function removeScheduleSlot(slotId: string) {
    await runScheduleAction(async () => {
      await fetchJson(`/api/schedule/slots?slotId=${slotId}`, {
        method: "DELETE",
      });
    });
  }

  async function allocateScheduleSlot(slotId: string, clientId: string) {
    await runScheduleAction(async () => {
      await fetchJson("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "allocate", slotId, clientId }),
      });
    });
  }

  return {
    weekStart,
    scheduleEntries,
    scheduleRange,
    applyingTemplate,
    clients,
    hasTemplate,
    settings,
    trainerLocations,
    scheduleError,
    setScheduleError,
    refresh,
    changeWeek,
    goToThisWeek,
    applyTemplateToCurrentWeek,
    addScheduleSlot,
    updateScheduleSlotLocation,
    removeScheduleSlot,
    allocateScheduleSlot,
  };
}
