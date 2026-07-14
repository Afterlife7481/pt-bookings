import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { FeedEntry } from "@/lib/services/feed";
import type { TrainerSettings } from "../types";

export function useFeedPage() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [feed, sett] = await Promise.all([
      fetchJson<FeedEntry[]>("/api/feed"),
      fetchJson<TrainerSettings>("/api/settings"),
    ]);
    setEntries(feed);
    setSettings(sett);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { entries, settings, loading, refresh };
}
