"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { cn, formatDateTimeInTimezone } from "@/lib/utils";
import type { WhatsAppRow } from "../types";

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

function whatsAppTypeLabel(messageType: string): string {
  switch (messageType) {
    case "confirmation":
      return "Booking confirmation";
    case "last_minute":
      return "Last-minute offer";
    case "last_minute_accepted":
      return "Offer accepted";
    case "last_minute_declined":
      return "Offer declined";
    case "session_canceled":
      return "Session canceled";
    case "session_changed":
      return "Session changed";
    case "interest_ack":
      return "Interest acknowledgement";
    case "invoice":
      return "Invoice";
    default:
      return messageType;
  }
}

function recipientLabel(message: WhatsAppRow): string {
  if (message.recipient === "trainer") return "To you (trainer)";
  return message.phone;
}

export function WhatsAppTab({
  messages,
  timezone,
}: {
  messages: WhatsAppRow[];
  timezone: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopied(id: string) {
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  return (
    <div className="space-y-3">
      <Card className="!border-amber-200 !bg-amber-50">
        <h2 className="text-sm font-semibold text-amber-900">
          WhatsApp is not integrated yet
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          This is a log of all the messages the app intends to send. Use the
          copy icon on any message to copy it, then paste into WhatsApp to send
          manually.
        </p>
      </Card>

      {messages.length === 0 && (
        <Card>
          <p className="text-slate-500">
            No messages yet. Messages are logged here (WhatsApp stub — check server
            console too).
          </p>
        </Card>
      )}
      {messages.map((m) => {
        const toTrainer = (m.recipient ?? "client") === "trainer";
        return (
          <Card
            key={m.id}
            className={cn(
              "relative",
              toTrainer && "!border-purple-200 !bg-purple-50",
            )}
          >
            <div className="absolute right-3 top-3">
              <CopyMessageButton
                messageId={m.id}
                body={m.body}
                copiedId={copiedId}
                onCopied={handleCopied}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={toTrainer ? "warning" : "default"}>
                  {whatsAppTypeLabel(m.messageType)}
                </Badge>
                <span
                  className={cn(
                    "text-sm",
                    toTrainer ? "font-medium text-purple-800" : "text-slate-500",
                  )}
                >
                  {recipientLabel(m)}
                </span>
              </div>
              <time dateTime={m.createdAt} className="text-xs text-slate-400">
                {formatDateTimeInTimezone(m.createdAt, timezone)}
              </time>
            </div>
            <LinkifiedText
              text={m.body}
              className={cn(
                "mt-2 text-sm",
                toTrainer && "text-purple-950",
              )}
            />
          </Card>
        );
      })}
    </div>
  );
}
