"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings } from "../types";

type TrainerSettingsContextValue = {
  settings: TrainerSettings | null;
  loading: boolean;
  refresh: () => Promise<TrainerSettings | null>;
};

const TrainerSettingsContext =
  createContext<TrainerSettingsContextValue | null>(null);

export function TrainerSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJson<TrainerSettings>("/api/settings");
      setSettings(data);
      return data;
    } catch {
      setSettings(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, refresh }),
    [settings, loading, refresh],
  );

  return (
    <TrainerSettingsContext.Provider value={value}>
      {children}
    </TrainerSettingsContext.Provider>
  );
}

export function useTrainerSettings() {
  const ctx = useContext(TrainerSettingsContext);
  if (!ctx) {
    throw new Error(
      "useTrainerSettings must be used within TrainerSettingsProvider",
    );
  }
  return ctx;
}

export async function logoutTrainer() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
