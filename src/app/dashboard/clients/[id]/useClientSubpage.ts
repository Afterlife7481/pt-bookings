"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientDetail } from "./client-types";

export function useClientSubpage(clientId: string) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (res.status === 404) {
      setNotFound(true);
      setClient(null);
      setLoading(false);
      return null;
    }
    if (!res.ok) {
      setLoading(false);
      return null;
    }
    const data: ClientDetail = await res.json();
    setClient(data);
    setNotFound(false);
    setLoading(false);
    return data;
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { client, loading, notFound, reload: load, setClient };
}
