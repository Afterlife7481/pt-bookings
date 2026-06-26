"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function LastMinuteOptInToggle({
  clientId,
  initialOptIn,
}: {
  clientId: string;
  initialOptIn: boolean;
}) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !optIn;
    await fetch("/api/opt-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, optIn: next }),
    });
    setOptIn(next);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
      <div>
        <p className="font-medium">Last-minute openings</p>
        <p className="text-sm text-slate-600">
          Get WhatsApp alerts when a slot opens up.
        </p>
      </div>
      <Button variant={optIn ? "primary" : "secondary"} onClick={toggle} disabled={loading}>
        {optIn ? "Opted in" : "Opt in"}
      </Button>
    </div>
  );
}
