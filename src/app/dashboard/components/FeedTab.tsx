"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { cn, formatDateTimeInTimezone } from "@/lib/utils";
import type { FeedEntry } from "@/lib/services/feed";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CopyMessageButton({
  messageId,
  body,
  copiedId,
  onCopied,
}: {
  messageId: string;
  body: string;
  copiedId: string | null;
  onCopied: (id: string) => void;
}) {
  const copied = copiedId === messageId;

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(body).then(() => onCopied(messageId));
      }}
      className={cn(
        "rounded-lg p-2 transition",
        copied
          ? "text-green-600 hover:bg-green-50"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
      )}
      aria-label={copied ? "Message copied" : "Copy message"}
      title={copied ? "Copied!" : "Copy message"}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </button>
  );
}

function entryTone(entry: FeedEntry): string {
  if (entry.kind === "template_conflict") {
    return "!border-amber-200 !bg-amber-50";
  }
  if (entry.kind === "conflict_acknowledged") {
    return "!border-green-200 !bg-green-50";
  }
  if (entry.isWhatsApp && entry.whatsapp?.recipient === "trainer") {
    return "!border-purple-200 !bg-purple-50";
  }
  return "";
}

function entryBadge(entry: FeedEntry) {
  if (entry.kind === "template_conflict") {
    return <Badge tone="warning">Schedule clash</Badge>;
  }
  if (entry.kind === "conflict_acknowledged") {
    return <Badge tone="success">Acknowledged</Badge>;
  }
  if (entry.isWhatsApp) {
    return <Badge tone="default">WhatsApp</Badge>;
  }
  return null;
}

export function FeedTab({
  entries,
  timezone,
  onRefresh,
}: {
  entries: FeedEntry[];
  timezone: string;
  onRefresh: () => void | Promise<void>;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  function handleCopied(id: string) {
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  async function notifyClient(alertId: string) {
    setNotifyingId(alertId);
    setNotifyError(null);
    try {
      const res = await fetch(`/api/feed/conflicts/${alertId}/notify`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setNotifyError(data.error ?? "Failed to send message");
        return;
      }
      await onRefresh();
    } catch {
      setNotifyError("Failed to send message");
    } finally {
      setNotifyingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="!border-slate-200 !bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-900">Feed</h2>
        <p className="mt-1 text-sm text-slate-600">
          Everything happening with your clients — schedule clashes, session
          updates, and outbound messages. Copy client messages from here and
          send them manually until messaging is integrated.
        </p>
      </Card>

      {notifyError ? (
        <p className="text-sm text-red-600" role="alert">
          {notifyError}
        </p>
      ) : null}

      {entries.length === 0 && (
        <Card>
          <p className="text-slate-500">
            No activity yet. Schedule clashes, bookings, and messages will
            appear here.
          </p>
        </Card>
      )}

      {entries.map((entry) => {
        const whatsappBody = entry.whatsapp?.body ?? entry.body;
        const copyId = entry.whatsapp?.id ?? entry.id;
        const toTrainer = entry.whatsapp?.recipient === "trainer";

        return (
          <Card key={entry.id} className={cn("relative", entryTone(entry))}>
            {entry.isWhatsApp ? (
              <div className="absolute right-3 top-3">
                <CopyMessageButton
                  messageId={copyId}
                  body={whatsappBody}
                  copiedId={copiedId}
                  onCopied={handleCopied}
                />
              </div>
            ) : null}

            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2",
                entry.isWhatsApp && "pr-10",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {entryBadge(entry)}
                {entry.clientName ? (
                  <span className="text-sm font-medium text-slate-700">
                    {entry.clientName}
                  </span>
                ) : null}
                {entry.isWhatsApp && entry.whatsapp ? (
                  <span
                    className={cn(
                      "text-sm",
                      toTrainer ? "font-medium text-purple-800" : "text-slate-500",
                    )}
                  >
                    {toTrainer ? "To you" : entry.whatsapp.phone}
                  </span>
                ) : null}
              </div>
              <time dateTime={entry.createdAt} className="text-xs text-slate-400">
                {formatDateTimeInTimezone(entry.createdAt, timezone)}
              </time>
            </div>

            <p
              className={cn(
                "mt-1 text-sm font-medium",
                entry.kind === "template_conflict"
                  ? "text-amber-950"
                  : entry.kind === "conflict_acknowledged"
                    ? "text-green-900"
                    : toTrainer
                      ? "text-purple-900"
                      : "text-slate-900",
              )}
            >
              {entry.title}
            </p>

            <LinkifiedText
              text={entry.body}
              className={cn(
                "mt-1 text-sm",
                toTrainer && "text-purple-950",
              )}
            />

            {entry.conflictAlert?.canNotify &&
            entry.kind === "template_conflict" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={notifyingId === entry.conflictAlert.id}
                  onClick={() =>
                    void notifyClient(entry.conflictAlert!.id)
                  }
                >
                  {notifyingId === entry.conflictAlert.id
                    ? "Sending…"
                    : entry.conflictAlert.status === "notified"
                      ? "Resend message"
                      : "Notify client"}
                </Button>
                {entry.conflictAlert.status === "notified" ? (
                  <span className="text-xs text-amber-800">Message sent</span>
                ) : null}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
