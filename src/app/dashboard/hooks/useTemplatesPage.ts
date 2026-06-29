import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type {
  DashboardTemplate,
  TrainerLocation,
  TrainerSettings,
} from "../types";

export function useTemplatesPage() {
  const [template, setTemplate] = useState<DashboardTemplate | null>(null);
  const [locations, setLocations] = useState<TrainerLocation[]>([]);
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [t, locs, sett] = await Promise.all([
      fetchJson<{ template: DashboardTemplate | null }>("/api/templates"),
      fetchJson<TrainerLocation[]>("/api/locations"),
      fetchJson<TrainerSettings>("/api/settings"),
    ]);
    setTemplate(t.template);
    setLocations(Array.isArray(locs) ? locs : []);
    setSettings(sett);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { template, locations, settings, loading, refresh };
}
