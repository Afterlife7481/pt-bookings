"use client";

import { TemplatesTab } from "../../components/TemplatesTab";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useTemplatesPage } from "../../hooks/useTemplatesPage";

export default function TemplatesPage() {
  const { template, locations, settings, loading, refresh } = useTemplatesPage();

  if (loading) {
    return (
      <SettingsPageLayout title="Weekly template">
        <p className="text-sm text-slate-500">Loading weekly template…</p>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Weekly template"
      description="Define your weekly slot pattern and apply it to the schedule."
      backHref="/dashboard/settings/schedule"
      backLabel="Schedule"
    >
      <TemplatesTab
        template={template}
        locations={locations}
        scheduleStartTime={settings?.scheduleStartTime ?? "07:00"}
        scheduleEndTime={settings?.scheduleEndTime ?? "21:00"}
        onRefresh={refresh}
      />
    </SettingsPageLayout>
  );
}
