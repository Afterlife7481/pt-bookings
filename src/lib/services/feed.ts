import { listWhatsAppLog } from "@/lib/whatsapp";
import { whatsappClickToChatUrl } from "@/lib/whatsapp-link";
import {
  conflictAlertTitle,
  formatConflictAlertBody,
  listScheduleConflictAlerts,
} from "@/lib/services/template-conflicts";
import type { NotifyChannel } from "@/lib/notify-channels";

export type FeedEntryKind =
  | "template_conflict"
  | "conflict_acknowledged"
  | "activity"
  | "whatsapp"
  | "email";

export type FeedEntry = {
  id: string;
  kind: FeedEntryKind;
  createdAt: string;
  title: string;
  body: string;
  clientId?: string;
  clientName?: string;
  /** True when this entry is a WhatsApp draft the trainer sent. */
  isWhatsApp: boolean;
  /** True when this entry is an emailed notification. */
  isEmail: boolean;
  conflictAlert?: {
    id: string;
    status: "open" | "notified" | "acknowledged";
    canNotify: boolean;
  };
  whatsapp?: {
    id: string;
    phone: string;
    messageType: string;
    recipient: "client" | "trainer";
    body: string;
    createdAt: string;
    channel: NotifyChannel;
    /** Click-to-chat URL for client WhatsApp drafts; null for email / trainer. */
    sendUrl: string | null;
  };
};

/** Message types logged when the trainer opens WhatsApp to send. */
const TRAINER_SENT_WHATSAPP_TYPES = new Set([
  "confirmation",
  "last_minute",
  "invoice",
  "template_conflict",
]);

export async function listFeed(trainerId: string): Promise<FeedEntry[]> {
  const [alerts, messages] = await Promise.all([
    listScheduleConflictAlerts(trainerId),
    listWhatsAppLog(trainerId),
  ]);

  const entries: FeedEntry[] = [];

  for (const { alert, clientName } of alerts) {
    const acknowledged = alert.status === "acknowledged";
    entries.push({
      id: `conflict-${alert.id}`,
      kind: acknowledged ? "conflict_acknowledged" : "template_conflict",
      createdAt:
        acknowledged && alert.acknowledgedAt
          ? alert.acknowledgedAt
          : alert.createdAt,
      title: acknowledged
        ? `${clientName} acknowledged clash`
        : conflictAlertTitle(clientName),
      body: acknowledged
        ? `${clientName} acknowledged the schedule clash for ${alert.slotLabel}.`
        : formatConflictAlertBody(
            clientName,
            alert.slotLabel,
            alert.holidayLabel,
          ),
      clientId: alert.clientId,
      clientName,
      isWhatsApp: false,
      isEmail: false,
      conflictAlert: {
        id: alert.id,
        status: alert.status,
        canNotify: !acknowledged,
      },
    });
  }

  for (const message of messages) {
    const channel = (message.channel ?? "whatsapp") as NotifyChannel;

    if (channel === "email") {
      entries.push({
        id: `wa-${message.id}`,
        kind: "email",
        createdAt: message.createdAt,
        title: feedTitleForMessage(
          message.messageType,
          message.recipient,
          channel,
        ),
        body: message.body,
        clientId: message.clientId ?? undefined,
        isWhatsApp: false,
        isEmail: true,
        whatsapp: {
          id: message.id,
          phone: message.phone,
          messageType: message.messageType,
          recipient: message.recipient,
          body: message.body,
          createdAt: message.createdAt,
          channel,
          sendUrl: null,
        },
      });
      continue;
    }

    // In-app notices to the trainer (cancel, offer accepted, etc.) — not WhatsApp.
    if (message.recipient === "trainer") {
      entries.push({
        id: `wa-${message.id}`,
        kind: "activity",
        createdAt: message.createdAt,
        title: feedTitleForMessage(
          message.messageType,
          message.recipient,
          channel,
        ),
        body: message.body,
        clientId: message.clientId ?? undefined,
        isWhatsApp: false,
        isEmail: false,
        whatsapp: {
          id: message.id,
          phone: message.phone,
          messageType: message.messageType,
          recipient: message.recipient,
          body: message.body,
          createdAt: message.createdAt,
          channel,
          sendUrl: null,
        },
      });
      continue;
    }

    // Only show client WhatsApp rows the trainer actually sent.
    if (!TRAINER_SENT_WHATSAPP_TYPES.has(message.messageType)) {
      continue;
    }

    entries.push({
      id: `wa-${message.id}`,
      kind: "whatsapp",
      createdAt: message.createdAt,
      title: feedTitleForMessage(
        message.messageType,
        message.recipient,
        channel,
      ),
      body: message.body,
      clientId: message.clientId ?? undefined,
      isWhatsApp: true,
      isEmail: false,
      whatsapp: {
        id: message.id,
        phone: message.phone,
        messageType: message.messageType,
        recipient: message.recipient,
        body: message.body,
        createdAt: message.createdAt,
        channel,
        sendUrl: whatsappClickToChatUrl(message.phone, message.body),
      },
    });
  }

  entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return entries;
}

function feedTitleForMessage(
  messageType: string,
  recipient: "client" | "trainer",
  channel: NotifyChannel,
): string {
  const via = channel === "email" ? " (email)" : "";
  if (messageType === "template_conflict") {
    return recipient === "client" ? "Clash notice" : "Clash notice";
  }
  if (messageType === "template_conflict_ack") {
    return recipient === "trainer"
      ? "Clash acknowledged"
      : "Acknowledgement sent";
  }
  if (messageType === "confirmation") return `Booking confirmation${via}`;
  if (messageType === "last_minute") return `Last-minute offer${via}`;
  if (messageType === "last_minute_accepted") return "Offer accepted";
  if (messageType === "last_minute_declined") return "Offer declined";
  if (messageType === "session_canceled") return "Session canceled";
  if (messageType === "session_changed") return "Session changed";
  if (messageType === "interest_ack") return "Interest acknowledgement";
  if (messageType === "invoice") return `Invoice${via}`;
  return messageType;
}
