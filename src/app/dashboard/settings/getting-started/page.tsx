"use client";

import { GettingStartedGuide } from "@/components/GettingStartedGuide";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";

export default function GettingStartedSettingsPage() {
  return (
    <SettingsPageLayout
      title="Getting started guide"
      description="Set up your account in order — regional settings, locations, template, clients, then invite other trainers."
      showBackLink={false}
    >
      <SettingsInset>
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <GettingStartedGuide />
        </div>
      </SettingsInset>
    </SettingsPageLayout>
  );
}
