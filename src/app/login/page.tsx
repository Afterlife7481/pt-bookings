"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";

type Mode = "login" | "signup";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(
    error === "invalid"
      ? "That sign-in link is invalid or has expired. Request a new one."
      : null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setMessage(null);
    setDevLink(null);

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: mode === "signup" ? name : undefined,
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
    if (data.devLink) setDevLink(data.devLink);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">PT Bookings</h1>
        <p className="mt-1 text-sm text-slate-600">Trainer sign in</p>
      </div>

      <Card>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
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
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
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
          {message && <p className="text-sm text-green-700">{message}</p>}
          {devLink && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Dev mode:{" "}
              <a href={devLink} className="break-all font-medium text-blue-600 underline">
                {devLink}
              </a>
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Sending…"
              : mode === "signup"
                ? "Send sign-up link"
                : "Send login link"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          We&apos;ll email you a magic link to sign in. In development, the link
          appears here and in the server console.
        </p>
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
