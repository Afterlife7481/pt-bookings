import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings, WhatsAppRow } from "../types";

export function useWhatsAppPage() {
  const [messages, setMessages] = useState<WhatsAppRow[]>([]);
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [wa, sett] = await Promise.all([
      fetchJson<WhatsAppRow[]>("/api/whatsapp"),
      fetchJson<TrainerSettings>("/api/settings"),
    ]);
    setMessages(wa);
    setSettings(sett);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { messages, settings, loading, refresh };
}
