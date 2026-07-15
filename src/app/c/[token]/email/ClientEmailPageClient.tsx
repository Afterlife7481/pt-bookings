"use client";

import { useEffect, useState } from "react";
import { ClientEmailEditor } from "@/components/ClientEmailEditor";
import {
  ClientInset,
  ClientPageLayout,
} from "@/components/client/client-ui";
import { InlineNotice } from "@/components/ui";

export function ClientEmailPageClient({
  clientToken,
  initialEmail,
}: {
  clientToken: string;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  return (
    <ClientPageLayout
      title="Your email"
      description="We use this for booking updates and optional last-minute selection alerts. Changes are confirmed with a verification code."
      backHref={`/c/${clientToken}`}
    >
      <ClientInset>
        {saved ? (
          <InlineNotice tone="success" className="mb-4">
            Saved
          </InlineNotice>
        ) : null}
        <ClientEmailEditor
          clientToken={clientToken}
          email={email}
          onEmailSaved={(next) => {
            setEmail(next);
            setSaved(true);
          }}
        />
      </ClientInset>
    </ClientPageLayout>
  );
}
