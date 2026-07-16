"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";

type Mode = "login" | "signup";
type Step = "details" | "code";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [formError, setFormError] = useState<string | null>(
    error === "otp"
      ? "Sign-in now uses a one-time code. Enter your email below to get a new code."
      : error === "invalid"
        ? "That sign-in attempt is invalid or has expired. Request a new code."
        : null,
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("details");
    setOtpCode("");
    setDevCode(null);
    setMessage(null);
    setFormError(null);
  }

  async function requestCode() {
    setLoading(true);
    setFormError(null);
    setMessage(null);
    setDevCode(null);

    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: mode === "signup" ? name : undefined,
        inviteCode: mode === "signup" ? inviteCode : undefined,
        purpose: mode,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setFormError(data.error ?? "Something went wrong");
      return;
    }

    setMessage(data.message);
    if (typeof data.devCode === "string") setDevCode(data.devCode);
    setStep("code");
    setResendIn(30);
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    await requestCode();
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otpCode }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setFormError(data.error ?? "Something went wrong");
      return;
    }

    router.replace("/dashboard/schedule");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">PT Bookings</h1>
        <p className="mt-1 text-sm text-slate-600">Trainer sign in</p>
      </div>

      <Card>
        {step === "details" ? (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  mode === "login"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  mode === "signup"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submitDetails} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-600">Your name</span>
                    <input
                      type="text"
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Trainer"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-600">Invite code</span>
                    <input
                      type="text"
                      className="rounded-lg border border-slate-300 px-3 py-2 uppercase tracking-wider"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="ABCD-1234"
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />
                    <span className="text-xs text-slate-500">
                      Sign up is invite-only. Use the code you were given.
                    </span>
                  </label>
                </>
              )}
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Email</span>
                <input
                  type="email"
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              We&apos;ll email a 6-digit code. Enter it here to stay in the app
              — no email link required.
            </p>
          </>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Enter your code</p>
              <p className="mt-1 text-sm text-slate-500">
                Sent to <span className="font-medium text-slate-700">{email}</span>
              </p>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                className="rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-2xl tracking-[0.35em]"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                required
              />
            </label>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            {devCode && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Dev mode code:{" "}
                <span className="font-mono text-base font-semibold tracking-widest">
                  {devCode}
                </span>
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? "Checking…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <button
                type="button"
                className="text-slate-500 hover:text-slate-900"
                onClick={() => {
                  setStep("details");
                  setOtpCode("");
                  setFormError(null);
                  setMessage(null);
                  setDevCode(null);
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-900 disabled:opacity-50"
                disabled={loading || resendIn > 0}
                onClick={() => void requestCode()}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Link href="/" className="text-center text-sm text-slate-500 hover:text-slate-900">
        ← Back to home
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-6 text-center text-slate-600">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
