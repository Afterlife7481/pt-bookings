"use client";

import { useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { TrainerContactKind } from "@/lib/contact";

export function TrainerContactForm({
  kind,
  submitLabel,
  placeholder,
}: {
  kind: TrainerContactKind;
  submitLabel: string;
  placeholder: string;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await fetchJson("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message }),
      });
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Your message</span>
        <textarea
          className="mt-1 min-h-[10rem] rounded-lg border border-slate-300 px-3 py-2"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setSent(false);
          }}
          placeholder={placeholder}
          required
          maxLength={4000}
          disabled={sending}
        />
      </label>

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {sent && (
        <InlineNotice tone="success">
          Thanks — your message has been sent.
        </InlineNotice>
      )}

      <Button type="submit" disabled={sending || !message.trim()}>
        {sending ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
