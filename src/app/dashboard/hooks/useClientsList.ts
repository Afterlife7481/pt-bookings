import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { DashboardClient } from "../types";

export function useClientsList() {
  const [clients, setClients] = useState<DashboardClient[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchJson<DashboardClient[]>("/api/clients");
    setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { clients, loading, refresh };
}
