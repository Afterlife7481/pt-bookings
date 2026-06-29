"use client";

import Link from "next/link";
import { TemplatesTab } from "../../components/TemplatesTab";
import { useTemplatesPage } from "../../hooks/useTemplatesPage";

export default function TemplatesPage() {
  const { template, locations, settings, loading, refresh } = useTemplatesPage();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading weekly template…</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/settings"
        className="inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to settings
      </Link>
      <TemplatesTab
        template={template}
        locations={locations}
        scheduleStartTime={settings?.scheduleStartTime ?? "07:00"}
        scheduleEndTime={settings?.scheduleEndTime ?? "21:00"}
        onRefresh={refresh}
      />
    </div>
  );
}
