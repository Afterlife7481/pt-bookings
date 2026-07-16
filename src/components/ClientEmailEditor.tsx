"use client";

import { useState } from "react";
import { Button, InlineNotice } from "@/components/ui";

export function ClientEmailEditor({
  clientToken,
  email,
  onEmailSaved,
}: {
  clientToken: string;
  email: string;
  onEmailSaved: (email: string) => void;
}) {
  const [draftEmail, setDraftEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const hasEmail = email.trim().length > 0;

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    setDevCode(null);
    try {
      const res = await fetch("/api/client/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_code",
          token: clientToken,
          email: draftEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send code");
        return;
      }
      setCodeSent(true);
      setNotice(data.message ?? "Check your email for a verification code.");
      if (typeof data.devCode === "string") setDevCode(data.devCode);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/client/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          token: clientToken,
          email: draftEmail,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to verify code");
        return;
      }
      onEmailSaved(typeof data.email === "string" ? data.email : draftEmail);
      setDraftEmail("");
      setCode("");
      setCodeSent(false);
      setDevCode(null);
      setNotice("Email saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {hasEmail ? (
        <p className="text-sm text-slate-600">
          Current email:{" "}
          <span className="font-medium text-slate-900">{email}</span>
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          Add an email so we can notify you if your last-minute selections change.
        </p>
      )}

      <form
        onSubmit={codeSent ? verifyCode : requestCode}
        className="space-y-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            {hasEmail ? "New email" : "Email"}
          </span>
          <input
            type="email"
            autoComplete="email"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={draftEmail}
            onChange={(e) => {
              setDraftEmail(e.target.value);
              setCodeSent(false);
              setCode("");
              setNotice(null);
              setError(null);
            }}
            required
            disabled={busy}
            placeholder="you@example.com"
          />
        </label>

        {codeSent ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              disabled={busy}
              placeholder="6-digit code"
            />
          </label>
        ) : null}

        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        {notice && <InlineNotice tone="success">{notice}</InlineNotice>}
        {devCode && (
          <p className="text-xs text-slate-500">
            Dev code: <span className="font-mono">{devCode}</span>
          </p>
        )}

        <Button type="submit" disabled={busy || !draftEmail.trim()}>
          {busy
            ? codeSent
              ? "Verifying…"
              : "Sending…"
            : codeSent
              ? "Verify and save email"
              : "Send verification code"}
        </Button>
      </form>
    </div>
  );
}
