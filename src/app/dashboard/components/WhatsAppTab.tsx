"use client";

import { Badge, Card } from "@/components/ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { cn, formatDateTimeInTimezone } from "@/lib/utils";
import type { WhatsAppRow } from "../types";

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
  return (
    <div className="space-y-3">
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
              toTrainer && "border-purple-200 bg-purple-50",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
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
