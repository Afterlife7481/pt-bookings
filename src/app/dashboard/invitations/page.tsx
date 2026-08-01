"use client";

import { useCallback, useEffect, useState } from "react";
import { StickyBackLink } from "@/components/StickyBackLink";
import { Button, Card, InlineNotice } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { TrainerInvitationsView } from "@/lib/services/invites";
import { formatDateTimeInTimezone } from "@/lib/utils";
import { useOnboardingBackLink } from "../hooks/useOnboardingBackLink";
import { useTrainerSettings } from "../hooks/useTrainerSettings";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export default function InvitationsPage() {
  const { settings } = useTrainerSettings();
  const back = useOnboardingBackLink({
    backHref: "/dashboard/schedule",
    backLabel: "Schedule",
  });
  const [data, setData] = useState<TrainerInvitationsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const invitations = await fetchJson<TrainerInvitationsView>(
        "/api/invitations",
      );
      setData(invitations);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyCode() {
    if (!data) return;
    await navigator.clipboard.writeText(data.displayCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-2">
        <StickyBackLink
          href={back.backHref}
          className="font-normal text-slate-500 hover:text-slate-900 hover:no-underline"
        >
          ← Back to {back.backLabel}
        </StickyBackLink>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invitations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Share your invite code so other trainers can sign up. New accounts can
            only join with an invitation code.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading invitations…</p>
      ) : null}
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      {data ? (
        <>
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Your invite code</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="font-mono text-2xl font-semibold tracking-wider text-slate-900">
                  {data.displayCode}
                </p>
                <Button type="button" variant="secondary" onClick={() => void copyCode()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {data.maxUses == null ? (
                <>
                  <span className="font-medium text-slate-900">{data.usedCount}</span>{" "}
                  signup{data.usedCount === 1 ? "" : "s"} so far (no limit).
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-900">
                    {data.usedCount} / {data.maxUses}
                  </span>{" "}
                  signups used
                  {data.remainingUses != null
                    ? ` · ${data.remainingUses} remaining`
                    : null}
                  .
                </>
              )}
            </p>
          </Card>

          <Card>
            <h2 className="font-semibold text-slate-900">Signups with your code</h2>
            {data.signups.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No one has signed up with your code yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.signups.map((signup) => (
                  <li
                    key={signup.trainerId}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="font-medium text-slate-800">{signup.name}</span>
                    <time
                      dateTime={signup.createdAt}
                      className="shrink-0 text-xs text-slate-400"
                    >
                      {formatDateTimeInTimezone(signup.createdAt, timezone)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
