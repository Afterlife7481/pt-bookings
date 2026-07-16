"use client";

import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { FeedTab } from "../components/FeedTab";
import { useFeedPage } from "../hooks/useFeedPage";

export default function FeedPage() {
  const { entries, settings, loading, refresh } = useFeedPage();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading feed…</p>;
  }

  return (
    <FeedTab
      entries={entries}
      timezone={settings?.timezone ?? DEFAULT_TIMEZONE}
      onRefresh={refresh}
    />
  );
}
