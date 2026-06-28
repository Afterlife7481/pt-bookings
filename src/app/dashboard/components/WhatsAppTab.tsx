"use client";

import { Badge, Card } from "@/components/ui";
import { LinkifiedText } from "@/components/LinkifiedText";
import { formatDateTimeInTimezone } from "@/lib/utils";
import type { WhatsAppRow } from "../types";

function whatsAppTypeLabel(messageType: string): string {
  switch (messageType) {
    case "confirmation":
      return "Booking confirmation";
    case "last_minute":
      return "Last-minute offer";
    case "interest_ack":
      return "Interest acknowledgement";
    default:
      return messageType;
  }
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
      {messages.map((m) => (
        <Card key={m.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{whatsAppTypeLabel(m.messageType)}</Badge>
              <span className="text-sm text-slate-500">{m.phone}</span>
            </div>
            <time dateTime={m.createdAt} className="text-xs text-slate-400">
              {formatDateTimeInTimezone(m.createdAt, timezone)}
            </time>
          </div>
          <LinkifiedText text={m.body} className="mt-2 text-sm" />
        </Card>
      ))}
    </div>
  );
}
