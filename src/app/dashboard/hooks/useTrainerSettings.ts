import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings } from "../types";

export function useTrainerSettings() {
  const [settings, setSettings] = useState<TrainerSettings | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchJson<TrainerSettings>("/api/settings");
    setSettings(data);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return { settings, refresh };
}

export async function logoutTrainer() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
