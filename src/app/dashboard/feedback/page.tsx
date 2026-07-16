"use client";

import {
  SettingsInset,
  SettingsPageLayout,
} from "../components/settings/settings-ui";
import { TrainerContactForm } from "../components/TrainerContactForm";

export default function FeedbackPage() {
  return (
    <SettingsPageLayout
      title="Feedback"
      description="Share general thoughts, praise, or anything that could be better. Your message is emailed to feedback@pt-bookings.com."
      showBackLink={false}
    >
      <SettingsInset>
        <TrainerContactForm
          kind="feedback"
          submitLabel="Send feedback"
          placeholder="What’s working well, and what could we improve?"
        />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
