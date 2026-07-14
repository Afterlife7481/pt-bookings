import { listWhatsAppLog } from "@/lib/whatsapp";
import {
  conflictAlertTitle,
  formatConflictAlertBody,
  listScheduleConflictAlerts,
} from "@/lib/services/template-conflicts";

export type FeedEntryKind =
  | "template_conflict"
  | "conflict_acknowledged"
  | "whatsapp";

export type FeedEntry = {
  id: string;
  kind: FeedEntryKind;
  createdAt: string;
  title: string;
  body: string;
  clientId?: string;
  clientName?: string;
  /** True when this entry represents a WhatsApp message (sent or logged). */
  isWhatsApp: boolean;
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
  };
};

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
      conflictAlert: {
        id: alert.id,
        status: alert.status,
        canNotify: !acknowledged,
      },
    });
  }

  for (const message of messages) {
    entries.push({
      id: `wa-${message.id}`,
      kind: "whatsapp",
      createdAt: message.createdAt,
      title: feedTitleForWhatsApp(message.messageType, message.recipient),
      body: message.body,
      clientId: message.clientId ?? undefined,
      isWhatsApp: true,
      whatsapp: {
        id: message.id,
        phone: message.phone,
        messageType: message.messageType,
        recipient: message.recipient,
        body: message.body,
        createdAt: message.createdAt,
      },
    });
  }

  entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return entries;
}

function feedTitleForWhatsApp(
  messageType: string,
  recipient: "client" | "trainer",
): string {
  if (messageType === "template_conflict") {
    return recipient === "client" ? "Clash notice" : "Clash notice";
  }
  if (messageType === "template_conflict_ack") {
    return recipient === "trainer"
      ? "Clash acknowledged"
      : "Acknowledgement sent";
  }
  if (messageType === "confirmation") return "Booking confirmation";
  if (messageType === "last_minute") return "Last-minute offer";
  if (messageType === "last_minute_accepted") return "Offer accepted";
  if (messageType === "last_minute_declined") return "Offer declined";
  if (messageType === "session_canceled") return "Session canceled";
  if (messageType === "session_changed") return "Session changed";
  if (messageType === "interest_ack") return "Interest acknowledgement";
  if (messageType === "invoice") return "Invoice";
  return messageType;
}
