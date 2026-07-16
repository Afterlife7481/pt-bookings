import { nanoid } from "nanoid";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { whatsappMessages } from "@/lib/db/schema";
import {
  bookingUrl,
  formatSlotLabel,
  interestUrl,
  nowIso,
} from "@/lib/constants";
import {
  formatInvoiceAmount,
  formatPaymentOptionsText,
  type PaymentDetailsForMessage,
} from "@/lib/payments";
import { whatsappClickToChatUrl } from "@/lib/whatsapp-link";
import type { NotifyChannel } from "@/lib/notify-channels";
import { sendEmail } from "@/lib/email";

export type WhatsAppDraft = {
  phone: string;
  body: string;
  /** wa.me URL for client WhatsApp messages; null for email / trainer notices. */
  sendUrl: string | null;
  channel: NotifyChannel;
};

type WhatsAppMessageType =
  | "confirmation"
  | "last_minute"
  | "interest_ack"
  | "invoice"
  | "last_minute_accepted"
  | "last_minute_declined"
  | "session_canceled"
  | "session_changed"
  | "template_conflict"
  | "portal_link";

async function logWhatsAppMessage(params: {
  trainerId: string;
  clientId?: string;
  phone: string;
  messageType: WhatsAppMessageType;
  recipient?: "client" | "trainer";
  body: string;
  channel?: NotifyChannel;
}): Promise<WhatsAppDraft> {
  const recipient = params.recipient ?? "client";
  const channel = params.channel ?? "whatsapp";
  const sendUrl =
    channel === "whatsapp" && recipient === "client"
      ? whatsappClickToChatUrl(params.phone, params.body)
      : null;

  const db = getDb();
  await db.insert(whatsappMessages).values({
    id: nanoid(),
    trainerId: params.trainerId,
    clientId: params.clientId ?? null,
    phone: params.phone,
    messageType: params.messageType,
    recipient,
    body: params.body,
    channel,
    // Logged when the trainer opens WhatsApp (or email is delivered).
    status: "sent",
    createdAt: nowIso(),
  });

  return { phone: params.phone, body: params.body, sendUrl, channel };
}

export function buildInvoiceMessageBody(params: {
  clientName: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  amountPence: number;
  currency?: string;
  paymentDetails: PaymentDetailsForMessage;
}): string {
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const amount = formatInvoiceAmount(params.amountPence, params.currency);
  const paymentLines = formatPaymentOptionsText(params.paymentDetails);
  return `Hi ${params.clientName}, please pay ${amount} for your PT session on ${sessionLabel}.\n\n${paymentLines}`;
}

export async function sendWhatsAppConfirmation(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  bookingToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
}): Promise<WhatsAppDraft> {
  const link = bookingUrl(params.bookingToken);
  const body = `Hi ${params.clientName}, your PT session is booked for ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. View details and manage your booking: ${link}`;

  console.log(`[WhatsApp draft → ${params.phone}] ${body}`);

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "confirmation",
    body,
  });
}

export function buildLastMinuteOfferBody(params: {
  clientName: string;
  offerToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  lockHours: number;
}): string {
  const link = interestUrl(params.offerToken);
  return `Hi ${params.clientName}, a last-minute slot opened: ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. You have ${params.lockHours} hour${params.lockHours === 1 ? "" : "s"} to accept or decline. View offer: ${link}`;
}

export async function sendWhatsAppLastMinute(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  offerToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
  lockHours: number;
}): Promise<WhatsAppDraft> {
  const body = buildLastMinuteOfferBody(params);

  console.log(`[WhatsApp draft → ${params.phone}] ${body}`);

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "last_minute",
    body,
    channel: "whatsapp",
  });
}

export async function sendLastMinuteEmail(params: {
  trainerId: string;
  clientId: string;
  email: string;
  offerToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
  lockHours: number;
  replyTo?: string | null;
}): Promise<WhatsAppDraft> {
  const body = buildLastMinuteOfferBody(params);
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const subject = `Last-minute PT slot available: ${sessionLabel}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 16px;">Last-minute PT slot</h1>
        <p style="font-size:14px;line-height:22px;margin:0 0 16px;white-space:pre-line;">${escapeHtmlPreservingNewlines(body)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const delivered = await sendEmail({
    to: params.email.trim(),
    subject,
    html,
    text: body,
    replyTo: params.replyTo?.trim() || undefined,
  });

  if (!delivered) {
    console.log(`[Last-minute email → ${params.email}] ${subject}\n${body}`);
  }

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.email.trim(),
    messageType: "last_minute",
    body,
    channel: "email",
  });
}

export async function sendWhatsAppLastMinuteAcceptedToTrainer(params: {
  trainerId: string;
  clientId: string;
  clientName: string;
  trainerEmail: string;
  slotStartAt: string;
  slotEndAt?: string | null;
}) {
  const body = `${params.clientName} accepted your last-minute offer for ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. The slot is now booked.`;

  console.log(`[WhatsApp draft → trainer ${params.trainerEmail}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.trainerEmail,
    messageType: "last_minute_accepted",
    recipient: "trainer",
    body,
  });
}

export async function sendWhatsAppLastMinuteDeclinedToTrainer(params: {
  trainerId: string;
  clientId: string;
  clientName: string;
  trainerEmail: string;
  slotStartAt: string;
  slotEndAt?: string | null;
}) {
  const body = `${params.clientName} declined your last-minute offer for ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. The slot is open again — you can send another offer.`;

  console.log(`[WhatsApp draft → trainer ${params.trainerEmail}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.trainerEmail,
    messageType: "last_minute_declined",
    recipient: "trainer",
    body,
  });
}

export async function sendWhatsAppSessionCanceledToTrainer(params: {
  trainerId: string;
  clientId: string;
  clientName: string;
  trainerEmail: string;
  slotStartAt: string;
  slotEndAt?: string | null;
}) {
  const body = `${params.clientName} canceled their PT session on ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. The slot is open again.`;

  console.log(`[WhatsApp draft → trainer ${params.trainerEmail}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.trainerEmail,
    messageType: "session_canceled",
    recipient: "trainer",
    body,
  });
}

export async function sendWhatsAppSessionChangedToTrainer(params: {
  trainerId: string;
  clientId: string;
  clientName: string;
  trainerEmail: string;
  fromSlotStartAt: string;
  fromSlotEndAt?: string | null;
  toSlotStartAt: string;
  toSlotEndAt?: string | null;
}) {
  const body = `${params.clientName} changed their session from ${formatSlotLabel(params.fromSlotStartAt, params.fromSlotEndAt)} to ${formatSlotLabel(params.toSlotStartAt, params.toSlotEndAt)}.`;

  console.log(`[WhatsApp draft → trainer ${params.trainerEmail}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.trainerEmail,
    messageType: "session_changed",
    recipient: "trainer",
    body,
  });
}

export async function sendWhatsAppInvoice(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  clientName: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  amountPence: number;
  currency?: string;
  paymentDetails: PaymentDetailsForMessage;
}): Promise<WhatsAppDraft> {
  const body = buildInvoiceMessageBody(params);

  console.log(`[WhatsApp draft → ${params.phone}] ${body}`);

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "invoice",
    body,
    channel: "whatsapp",
  });
}

export async function sendInvoiceEmail(params: {
  trainerId: string;
  clientId: string;
  email: string;
  clientName: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  amountPence: number;
  currency?: string;
  paymentDetails: PaymentDetailsForMessage;
  replyTo?: string | null;
}): Promise<WhatsAppDraft> {
  const body = buildInvoiceMessageBody(params);
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const amount = formatInvoiceAmount(params.amountPence, params.currency);
  const subject = `Invoice for your PT session on ${sessionLabel}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 16px;">PT session invoice</h1>
        <p style="font-size:14px;line-height:22px;margin:0 0 16px;white-space:pre-line;">${escapeHtmlPreservingNewlines(body)}</p>
        <p style="font-size:12px;line-height:18px;color:#475569;margin:0;">Amount due: ${escapeHtml(amount)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const delivered = await sendEmail({
    to: params.email.trim(),
    subject,
    html,
    text: body,
    replyTo: params.replyTo?.trim() || undefined,
  });

  if (!delivered) {
    console.log(`[Invoice email → ${params.email}] ${subject}\n${body}`);
  }

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.email.trim(),
    messageType: "invoice",
    body,
    channel: "email",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlPreservingNewlines(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

export async function sendWhatsAppTemplateConflictToClient(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  clientName: string;
  body: string;
}): Promise<WhatsAppDraft> {
  console.log(`[WhatsApp draft → ${params.phone}] ${params.body}`);

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "template_conflict",
    body: params.body,
  });
}

export function buildPortalLinkMessageBody(params: {
  clientName: string;
  portalUrl: string;
}): string {
  return `Hi ${params.clientName}, here is your personal training portal link. You can view sessions, book, and manage your bookings here: ${params.portalUrl}`;
}

export async function sendWhatsAppPortalLink(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  clientName: string;
  portalUrl: string;
}): Promise<WhatsAppDraft> {
  const body = buildPortalLinkMessageBody(params);
  console.log(`[WhatsApp draft → ${params.phone}] ${body}`);

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "portal_link",
    body,
    channel: "whatsapp",
  });
}

export async function sendPortalLinkEmail(params: {
  trainerId: string;
  clientId: string;
  email: string;
  clientName: string;
  portalUrl: string;
  replyTo?: string | null;
}): Promise<WhatsAppDraft> {
  const body = buildPortalLinkMessageBody(params);
  const subject = "Your personal training portal link";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 16px;">Your PT portal</h1>
        <p style="font-size:14px;line-height:22px;margin:0 0 16px;white-space:pre-line;">${escapeHtmlPreservingNewlines(body)}</p>
        <p style="margin:0 0 16px;">
          <a href="${escapeHtml(params.portalUrl)}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;">
            Open portal
          </a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const delivered = await sendEmail({
    to: params.email.trim(),
    subject,
    html,
    text: body,
    replyTo: params.replyTo?.trim() || undefined,
  });

  if (!delivered) {
    console.log(`[Portal link email → ${params.email}] ${subject}\n${body}`);
  }

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.email.trim(),
    messageType: "portal_link",
    body,
    channel: "email",
  });
}

export async function listWhatsAppLog(trainerId: string) {
  const db = getDb();
  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.trainerId, trainerId))
    .orderBy(desc(whatsappMessages.createdAt));
}
