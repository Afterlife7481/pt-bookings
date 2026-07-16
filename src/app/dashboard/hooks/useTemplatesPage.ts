import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { DashboardTemplate, TrainerLocation } from "../types";
import { useTrainerSettings } from "./useTrainerSettings";

export function useTemplatesPage() {
  const { settings } = useTrainerSettings();
  const [template, setTemplate] = useState<DashboardTemplate | null>(null);
  const [locations, setLocations] = useState<TrainerLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [t, locs] = await Promise.all([
      fetchJson<{ template: DashboardTemplate | null }>("/api/templates"),
      fetchJson<TrainerLocation[]>("/api/locations"),
    ]);
    setTemplate(t.template);
    setLocations(Array.isArray(locs) ? locs : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { template, locations, settings, loading, refresh };
}
