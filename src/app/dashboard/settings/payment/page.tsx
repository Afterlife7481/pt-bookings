"use client";

import { PaymentDetailsSection } from "../../components/PaymentDetailsSection";
import { PaymentMethodsSection } from "../../components/PaymentMethodsSection";
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
      description="Payment methods for marking sessions paid, plus bank details for invoices."
    >
      <div className="space-y-6">
        <SettingsInset>
          <h2 className="font-semibold text-slate-900">Payment methods</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose these when you mark a session as paid. Defaults are Cash,
            Transfer, and Monzo.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Editing or deleting a method only changes this list. Past paid
            sessions keep the method name that was saved at the time.
          </p>
          <div className="mt-4">
            <PaymentMethodsSection embedded />
          </div>
        </SettingsInset>
        <SettingsInset>
          <PaymentDetailsSection
            settings={settings}
            onSaved={refresh}
            embedded
          />
        </SettingsInset>
      </div>
    </SettingsPageLayout>
  );
}
