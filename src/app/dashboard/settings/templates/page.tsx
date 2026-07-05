"use client";

import { TemplatesTab } from "../../components/TemplatesTab";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useTemplatesPage } from "../../hooks/useTemplatesPage";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function TemplatesPage() {
  const { template, locations, settings, loading, refresh } = useTemplatesPage();
  const back = useOnboardingBackLink();

  if (loading) {
    return (
      <SettingsPageLayout
        title="Weekly template"
        backHref={back.backHref}
        backLabel={back.backLabel}
      >
        <p className="text-sm text-slate-500">Loading weekly template…</p>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Weekly template"
      description="Define your weekly slot pattern and apply it to the schedule."
      backHref={back.backHref}
      backLabel={back.backLabel}
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
