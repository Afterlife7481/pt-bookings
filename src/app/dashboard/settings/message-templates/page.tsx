"use client";

import { MessageTemplatesSettingsForm } from "../../components/settings/MessageTemplatesSettingsForm";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";

export default function MessageTemplatesSettingsPage() {
  return (
    <SettingsPageLayout
      title="Message templates"
      description="Edit the email and WhatsApp messages sent to your clients, or reset them to the defaults."
    >
      <SettingsInset>
        <MessageTemplatesSettingsForm />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
