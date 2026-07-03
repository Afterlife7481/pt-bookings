"use client";

import { PaymentDetailsSection } from "../../components/PaymentDetailsSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function PaymentSettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Payment details"
      description="Bank details for clients paying by transfer. Shared when you send payment requests."
    >
      <SettingsInset>
        <PaymentDetailsSection
          settings={settings}
          onSaved={refresh}
          embedded
        />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
