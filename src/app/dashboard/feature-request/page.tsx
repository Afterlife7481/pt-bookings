"use client";

import { SettingsPageLayout } from "../components/settings/settings-ui";
import { TrainerContactForm } from "../components/TrainerContactForm";

export default function FeatureRequestPage() {
  return (
    <SettingsPageLayout
      title="Feature request"
      description="Tell us what would make PT Bookings more useful for your training business. Your message is emailed to feature@pt-bookings.com."
      showBackLink={false}
    >
      <TrainerContactForm
        kind="feature_request"
        submitLabel="Send feature request"
        placeholder="Describe the feature you’d like, and how it would help you…"
      />
    </SettingsPageLayout>
  );
}
