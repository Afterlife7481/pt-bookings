"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import { cn, formatDateTimeInTimezone } from "@/lib/utils";
import type { FeedEntry } from "@/lib/services/feed";
import type { NotifyChannel } from "@/lib/notify-channels";
import {
  prepareWhatsAppOpen,
  prepareWhatsAppOpenForPhone,
} from "@/lib/whatsapp-link";

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
  if (entry.kind === "activity") {
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
  if (entry.kind === "activity") {
    return <Badge tone="default">Update</Badge>;
  }
  if (entry.isEmail) {
    return <Badge tone="default">Email</Badge>;
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
  const [notifyTarget, setNotifyTarget] = useState<FeedEntry | null>(null);

  function handleCopied(id: string) {
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  async function notifyClient(channels: NotifyChannel[]) {
    const alert = notifyTarget?.conflictAlert;
    if (!alert) return;

    const wantWhatsApp = channels.includes("whatsapp");
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (wantWhatsApp) {
      const prepared = prepareWhatsAppOpenForPhone(alert.clientPhone);
      if (!prepared.ok) {
        setNotifyError(prepared.error);
        return;
      }
      waOpen = prepared.opener;
    }

    setNotifyingId(alert.id);
    setNotifyError(null);
    try {
      const res = await fetch(`/api/feed/conflicts/${alert.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const data = await res.json();
      if (!res.ok) {
        waOpen?.finish(null);
        setNotifyError(data.error ?? "Failed to prepare message");
        return;
      }
      if (wantWhatsApp) {
        if (
          typeof data.whatsappUrl === "string" &&
          data.whatsappUrl.length > 0
        ) {
          waOpen?.finish(data.whatsappUrl);
        } else {
          waOpen?.finish(null);
          setNotifyError(
            "Message logged, but WhatsApp could not open. Check the client phone number.",
          );
          return;
        }
      }
      setNotifyTarget(null);
      await onRefresh();
    } catch {
      waOpen?.finish(null);
      setNotifyError("Failed to prepare message");
    } finally {
      setNotifyingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="!border-slate-200 !bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-900">Activity Feed</h2>
        <p className="mt-1 text-sm text-slate-600">
          Schedule clashes, session updates, and WhatsApp or email messages you
          have sent.
        </p>
      </Card>

      {notifyError && !notifyTarget ? (
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
        const isActivity = entry.kind === "activity";
        const isOutbound = entry.isWhatsApp || entry.isEmail;

        return (
          <Card key={entry.id} className={cn("relative", entryTone(entry))}>
            {isOutbound ? (
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
                isOutbound && "pr-10",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {entryBadge(entry)}
                {entry.clientName ? (
                  <span className="text-sm font-medium text-slate-700">
                    {entry.clientName}
                  </span>
                ) : null}
                {isOutbound && entry.whatsapp ? (
                  <span className="text-sm text-slate-500">
                    {entry.whatsapp.phone}
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
                    : isActivity
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
                isActivity && "text-purple-950",
              )}
            />

            {entry.conflictAlert?.canNotify &&
            entry.kind === "template_conflict" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={notifyingId === entry.conflictAlert.id}
                  onClick={() => {
                    setNotifyError(null);
                    setNotifyTarget(entry);
                  }}
                >
                  {notifyingId === entry.conflictAlert.id
                    ? "Sending…"
                    : entry.conflictAlert.status === "notified"
                      ? "Notify again"
                      : "Notify client"}
                </Button>
                {entry.conflictAlert.status === "notified" ? (
                  <span className="text-xs text-amber-800">Notified</span>
                ) : null}
              </div>
            ) : null}
          </Card>
        );
      })}

      {notifyTarget?.conflictAlert && notifyTarget.clientName ? (
        <SendInvoiceChannelSheet
          clientName={notifyTarget.clientName}
          email={notifyTarget.conflictAlert.clientEmail}
          phone={notifyTarget.conflictAlert.clientPhone}
          preferredNotifyChannel={
            notifyTarget.conflictAlert.preferredNotifyChannel
          }
          busy={notifyingId === notifyTarget.conflictAlert.id}
          error={notifyError}
          title="Notify client"
          subtitle={`Choose how to send the schedule clash notice to ${notifyTarget.clientName}.`}
          onClose={() => {
            setNotifyTarget(null);
            setNotifyError(null);
          }}
          onSend={notifyClient}
        />
      ) : null}
    </div>
  );
}
