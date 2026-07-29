"use client";

import { Badge } from "@/components/ui";
import { PaymentMethodsSection } from "../../components/PaymentMethodsSection";
import { SettingsPageLayout } from "../../components/settings/settings-ui";

const COMING_SOON_INTEGRATIONS = [
  "Stripe",
  "Paypal",
  "Revolut Pay",
] as const;

const PAYMENT_TYPE_EXAMPLES = [
  {
    name: "Revolut RevTag",
    description:
      "Revolut users can send money for free using your @username RevTag. Add a Revolut method and put your RevTag in the details.",
  },
  {
    name: "Monzo.me",
    description:
      "Your personal Monzo.me link (monzo.me/yourname) lets clients open a payment page and send you money. Add a Monzo method and paste the link in the details.",
  },
  {
    name: "Paypal.me",
    description:
      "Your paypal.me/yourname link lets clients pay you online. Add a Paypal method and paste the link in the details.",
  },
] as const;

export default function PaymentSettingsPage() {
  return (
    <SettingsPageLayout
      title="Payment details"
      description="Cash and Transfer are always available. Add details for each method — these appear on payment requests you send to clients."
    >
      <div className="space-y-8">
        <section>
          <h2 className="font-semibold text-slate-900">Payment methods</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose a method when marking a session paid. Payment requests list
            every method with its details (for example bank transfer
            instructions on Transfer).
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Cash and Transfer cannot be removed. Past paid sessions keep the
            method name that was saved at the time.
          </p>
          <div className="mt-4">
            <PaymentMethodsSection />
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Examples</h2>
          <p className="mt-1 text-sm text-slate-600">
            Common ways trainers collect payment — add these as methods with the
            details clients need.
          </p>
          <ul className="mt-4 space-y-3">
            {PAYMENT_TYPE_EXAMPLES.map((example) => (
              <li key={example.name} className="text-sm">
                <p className="font-medium text-slate-900">{example.name}</p>
                <p className="mt-0.5 text-slate-600">{example.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Integrations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Online payment and invoicing connections.
          </p>
          <ul className="mt-4 space-y-2">
            {COMING_SOON_INTEGRATIONS.map((label) => (
              <li
                key={label}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <span className="text-sm text-slate-700">{label}</span>
                <Badge>Coming soon</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SettingsPageLayout>
  );
}
