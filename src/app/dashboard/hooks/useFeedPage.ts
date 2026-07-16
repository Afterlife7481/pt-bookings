import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { FeedEntry } from "@/lib/services/feed";
import { useTrainerSettings } from "./useTrainerSettings";

export function useFeedPage() {
  const { settings } = useTrainerSettings();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const feed = await fetchJson<FeedEntry[]>("/api/feed");
    setEntries(feed);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { entries, settings, loading, refresh };
}
