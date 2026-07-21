import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  error?: string;
};

export type CachedWeekSchedule = {
  entries: ScheduleEntry[];
  holidays: ScheduleHoliday[];
  weekStart: string;
  weekEnd: string;
};

type ScheduleResponse = {
  entries: ScheduleEntry[];
  weekStart: string;
  weekEnd: string;
  holidays: ScheduleHoliday[];
};

function toCachedWeek(sched: ScheduleResponse): CachedWeekSchedule {
  return {
    entries: sched.entries,
    holidays: sched.holidays ?? [],
    weekStart: sched.weekStart,
    weekEnd: sched.weekEnd,
  };
}

export function useSchedulePage() {
  const { settings } = useTrainerSettings();
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleHolidays, setScheduleHolidays] = useState<ScheduleHoliday[]>(
    [],
  );
  const [scheduleRange, setScheduleRange] = useState({
    weekStart: "",
    weekEnd: "",
  });
  /** Neighbor weeks for carousel edge slides (instant swipe). */
  const [neighborWeeks, setNeighborWeeks] = useState<{
    prev: CachedWeekSchedule | null;
    next: CachedWeekSchedule | null;
  }>({ prev: null, next: null });
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [clients, setClients] = useState<DashboardClient[]>([]);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [trainerLocations, setTrainerLocations] = useState<TrainerLocation[]>(
    [],
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const cacheRef = useRef(new Map<string, CachedWeekSchedule>());
  const inflightRef = useRef(
    new Map<string, Promise<CachedWeekSchedule | null>>(),
  );

  const applyWeekToState = useCallback((week: CachedWeekSchedule) => {
    setScheduleEntries(week.entries);
    setScheduleHolidays(week.holidays);
    setScheduleRange({ weekStart: week.weekStart, weekEnd: week.weekEnd });
  }, []);

  const fetchWeek = useCallback(
    async (activeWeek: string): Promise<CachedWeekSchedule | null> => {
      const cached = cacheRef.current.get(activeWeek);
      if (cached) return cached;

      const inflight = inflightRef.current.get(activeWeek);
      if (inflight) return inflight;

      const promise = fetchJson<ScheduleResponse>(
        `/api/schedule?weekStart=${activeWeek}`,
      )
        .then((sched) => {
          const week = toCachedWeek(sched);
          cacheRef.current.set(activeWeek, week);
          inflightRef.current.delete(activeWeek);
          return week;
        })
        .catch(() => {
          inflightRef.current.delete(activeWeek);
          return null;
        });

      inflightRef.current.set(activeWeek, promise);
      return promise;
    },
    [],
  );

  const syncNeighbors = useCallback(
    (activeWeek: string) => {
      const prevKey = shiftWeekStart(activeWeek, -1);
      const nextKey = shiftWeekStart(activeWeek, 1);
      setNeighborWeeks({
        prev: cacheRef.current.get(prevKey) ?? null,
        next: cacheRef.current.get(nextKey) ?? null,
      });
    },
    [],
  );

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

  const loadWeekSchedule = useCallback(
    async (activeWeek: string, opts?: { bustCache?: boolean }) => {
      if (opts?.bustCache) {
        cacheRef.current.delete(activeWeek);
        inflightRef.current.delete(activeWeek);
      }
      const week = await fetchWeek(activeWeek);
      if (!week) return;
      applyWeekToState(week);
      syncNeighbors(activeWeek);
    },
    [applyWeekToState, fetchWeek, syncNeighbors],
  );

  const refreshWeek = useCallback(async () => {
    const activeWeek = weekStart || defaultWeekStart();
    await loadWeekSchedule(activeWeek, { bustCache: true });
    // Refresh neighbors in the background so the next swipe stays warm.
    void Promise.all([
      fetchWeek(shiftWeekStart(activeWeek, -1)).then(() =>
        syncNeighbors(activeWeek),
      ),
      fetchWeek(shiftWeekStart(activeWeek, 1)).then(() =>
        syncNeighbors(activeWeek),
      ),
    ]);
  }, [fetchWeek, loadWeekSchedule, syncNeighbors, weekStart]);

  const refresh = useCallback(async () => {
    const activeWeek = weekStart || defaultWeekStart();
    await Promise.all([
      loadSupportingData(),
      loadWeekSchedule(activeWeek, { bustCache: true }),
    ]);
    void Promise.all([
      fetchWeek(shiftWeekStart(activeWeek, -1)),
      fetchWeek(shiftWeekStart(activeWeek, 1)),
    ]).then(() => syncNeighbors(activeWeek));
  }, [
    fetchWeek,
    loadSupportingData,
    loadWeekSchedule,
    syncNeighbors,
    weekStart,
  ]);

  useEffect(() => {
    loadSupportingData().catch(() => {});
  }, [loadSupportingData]);

  // Apply cached weeks before paint so swipes don't flash empty/stale data.
  useLayoutEffect(() => {
    const activeWeek = weekStart || defaultWeekStart();
    const cached = cacheRef.current.get(activeWeek);
    if (cached) {
      applyWeekToState(cached);
    }
    syncNeighbors(activeWeek);
  }, [weekStart, applyWeekToState, syncNeighbors]);

  useEffect(() => {
    const activeWeek = weekStart || defaultWeekStart();
    const prevKey = shiftWeekStart(activeWeek, -1);
    const nextKey = shiftWeekStart(activeWeek, 1);
    let cancelled = false;

    (async () => {
      const current = await fetchWeek(activeWeek);
      if (cancelled) return;
      if (current) applyWeekToState(current);

      await Promise.all([fetchWeek(prevKey), fetchWeek(nextKey)]);
      if (cancelled) return;
      syncNeighbors(activeWeek);
    })();

    return () => {
      cancelled = true;
    };
  }, [weekStart, applyWeekToState, fetchWeek, syncNeighbors]);

  function selectWeek(nextWeekStart: string) {
    const cached = cacheRef.current.get(nextWeekStart);
    if (cached) {
      applyWeekToState(cached);
    }
    setNeighborWeeks({
      prev: cacheRef.current.get(shiftWeekStart(nextWeekStart, -1)) ?? null,
      next: cacheRef.current.get(shiftWeekStart(nextWeekStart, 1)) ?? null,
    });
    setWeekStart(nextWeekStart);
  }

  function changeWeek(delta: number) {
    selectWeek(shiftWeekStart(weekStart || defaultWeekStart(), delta));
  }

  function goToThisWeek() {
    selectWeek(defaultWeekStart());
  }

  function goToWeek(nextWeekStart: string) {
    selectWeek(nextWeekStart);
  }

  async function runScheduleAction(
    action: () => Promise<void>,
    options?: { bannerError?: boolean },
  ) {
    const bannerError = options?.bannerError !== false;
    setScheduleError(null);
    try {
      await action();
      await refreshWeek();
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Something went wrong";
      if (bannerError) {
        setScheduleError(message);
      }
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
      return {
        ok: false,
        conflicts: [],
        recommendations: [],
        slotsCreated: 0,
        error: e instanceof ApiError ? e.message : "Failed to apply template",
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
    }, { bannerError: false });
  }

  async function updateScheduleSlotLocation(slotId: string, locationId: string) {
    await runScheduleAction(async () => {
      await fetchJson("/api/schedule/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, locationId }),
      });
    }, { bannerError: false });
  }

  async function updateScheduleSlot(
    slotId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    locationId: string,
  ) {
    await runScheduleAction(async () => {
      await fetchJson("/api/schedule/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          dayOfWeek,
          startTime,
          endTime,
          locationId,
        }),
      });
    }, { bannerError: false });
  }

  async function removeScheduleSlot(slotId: string) {
    await runScheduleAction(async () => {
      await fetchJson(`/api/schedule/slots?slotId=${slotId}`, {
        method: "DELETE",
      });
    }, { bannerError: false });
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
      }, { bannerError: false });
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
    neighborWeeks,
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
    updateScheduleSlot,
    removeScheduleSlot,
    allocateScheduleSlot,
  };
}
