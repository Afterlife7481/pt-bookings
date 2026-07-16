import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { defaultWeekStart, shiftWeekStart } from "@/lib/schedule-utils";
import type { ScheduleEntry, ScheduleHoliday } from "@/lib/services/schedule";
import type { DashboardClient, TrainerLocation } from "../types";
import { prepareWhatsAppOpen, validateWhatsAppPhone } from "@/lib/whatsapp-link";
import { useTrainerSettings } from "./useTrainerSettings";

export type ApplyTemplateOutcome = {
  ok: boolean;
  conflicts: string[];
  recommendations: string[];
  slotsCreated: number;
};

type ScheduleResponse = {
  entries: ScheduleEntry[];
  weekStart: string;
  weekEnd: string;
  holidays: ScheduleHoliday[];
};

export function useSchedulePage() {
  const { settings } = useTrainerSettings();
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleHolidays, setScheduleHolidays] = useState<ScheduleHoliday[]>([]);
  const [scheduleRange, setScheduleRange] = useState({ weekStart: "", weekEnd: "" });
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [clients, setClients] = useState<DashboardClient[]>([]);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [trainerLocations, setTrainerLocations] = useState<TrainerLocation[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const loadSupportingData = useCallback(async () => {
    const [c, t, locs] = await Promise.all([
      fetchJson<DashboardClient[]>("/api/clients"),
      fetchJson<{ template: unknown | null }>("/api/templates"),
      fetchJson<TrainerLocation[]>("/api/locations"),
    ]);
    setClients(c);
    setHasTemplate(t.template !== null);
    setTrainerLocations(Array.isArray(locs) ? locs : []);
  }, []);

  const loadWeekSchedule = useCallback(async (activeWeek: string) => {
    const sched = await fetchJson<ScheduleResponse>(
      `/api/schedule?weekStart=${activeWeek}`,
    );
    setScheduleEntries(sched.entries);
    setScheduleHolidays(sched.holidays ?? []);
    setScheduleRange({ weekStart: sched.weekStart, weekEnd: sched.weekEnd });
  }, []);

  const refreshWeek = useCallback(async () => {
    const activeWeek = weekStart || defaultWeekStart();
    await loadWeekSchedule(activeWeek);
  }, [loadWeekSchedule, weekStart]);

  const refresh = useCallback(async () => {
    const activeWeek = weekStart || defaultWeekStart();
    await Promise.all([loadSupportingData(), loadWeekSchedule(activeWeek)]);
  }, [loadSupportingData, loadWeekSchedule, weekStart]);

  useEffect(() => {
    loadSupportingData().catch(() => {});
  }, [loadSupportingData]);

  useEffect(() => {
    const activeWeek = weekStart || defaultWeekStart();
    let cancelled = false;

    (async () => {
      try {
        const sched = await fetchJson<ScheduleResponse>(
          `/api/schedule?weekStart=${activeWeek}`,
        );
        if (cancelled) return;
        setScheduleEntries(sched.entries);
        setScheduleHolidays(sched.holidays ?? []);
        setScheduleRange({ weekStart: sched.weekStart, weekEnd: sched.weekEnd });
      } catch {
        // Keep previous week visible if the request fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  function changeWeek(delta: number) {
    setWeekStart((ws) => shiftWeekStart(ws || defaultWeekStart(), delta));
  }

  function goToThisWeek() {
    setWeekStart(defaultWeekStart());
  }

  function goToWeek(nextWeekStart: string) {
    setWeekStart(nextWeekStart);
  }

  async function runScheduleAction(action: () => Promise<void>) {
    setScheduleError(null);
    try {
      await action();
      await refreshWeek();
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Something went wrong";
      setScheduleError(message);
      throw e instanceof Error ? e : new Error(message);
    }
  }

  async function applyTemplateToCurrentWeek(): Promise<ApplyTemplateOutcome> {
    setApplyingTemplate(true);
    setScheduleError(null);
    try {
      const result = await fetchJson<{
        slotsCreated: number;
        conflicts: string[];
        recommendations: string[];
      }>("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          weekStart,
        }),
      });
      await refreshWeek();
      return {
        ok: true,
        conflicts: result.conflicts ?? [],
        recommendations: result.recommendations ?? [],
        slotsCreated: result.slotsCreated ?? 0,
      };
    } catch (e) {
      setScheduleError(
        e instanceof ApiError ? e.message : "Failed to apply template",
      );
      return {
        ok: false,
        conflicts: [],
        recommendations: [],
        slotsCreated: 0,
      };
    } finally {
      setApplyingTemplate(false);
    }
  }

  async function addScheduleSlot(
    dayOfWeek: number,
    startTime: string,
    locationId: string,
    endTime?: string,
  ) {
    await runScheduleAction(async () => {
      await fetchJson("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          dayOfWeek,
          startTime,
          endTime,
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
    const client = clients.find((c) => c.id === clientId);
    const phoneCheck = validateWhatsAppPhone(client?.phone);
    const waOpen = phoneCheck.ok ? prepareWhatsAppOpen() : null;
    let whatsappOpened = false;

    try {
      await runScheduleAction(async () => {
        const result = await fetchJson<{
          whatsappUrl?: string | null;
        }>("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "allocate", slotId, clientId }),
        });
        if (waOpen) {
          waOpen.finish(result.whatsappUrl);
          whatsappOpened = true;
        }
      });
    } catch (e) {
      if (!whatsappOpened) waOpen?.finish(null);
      throw e;
    }
  }

  return {
    weekStart,
    scheduleEntries,
    scheduleHolidays,
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
    goToWeek,
    applyTemplateToCurrentWeek,
    addScheduleSlot,
    updateScheduleSlotLocation,
    removeScheduleSlot,
    allocateScheduleSlot,
  };
}
