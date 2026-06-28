"use client";

import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { WhatsAppTab } from "../components/WhatsAppTab";
import { useWhatsAppPage } from "../hooks/useWhatsAppPage";

export default function WhatsAppPage() {
  const { messages, settings, loading } = useWhatsAppPage();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading messages…</p>;
  }

  return (
    <WhatsAppTab
      messages={messages}
      timezone={settings?.timezone ?? DEFAULT_TIMEZONE}
    />
  );
}
