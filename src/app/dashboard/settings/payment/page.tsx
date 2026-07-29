"use client";

import { PaymentMethodsSection } from "../../components/PaymentMethodsSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";

export default function PaymentSettingsPage() {
  return (
    <SettingsPageLayout
      title="Payment details"
      description="Cash and Transfer are always available. Add details for each method — these appear on payment requests you send to clients."
    >
      <SettingsInset>
        <h2 className="font-semibold text-slate-900">Payment methods</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose a method when marking a session paid. Payment requests list
          every method with its details (for example bank transfer instructions
          on Transfer).
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Cash and Transfer cannot be removed. Past paid sessions keep the
          method name that was saved at the time.
        </p>
        <div className="mt-4">
          <PaymentMethodsSection />
        </div>
      </SettingsInset>
    </SettingsPageLayout>
  );
}
