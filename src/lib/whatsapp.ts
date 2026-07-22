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
import { renderTrainerMessageTemplate } from "@/lib/services/message-templates";

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

function lockHoursLabel(lockHours: number): string {
  return `${lockHours} hour${lockHours === 1 ? "" : "s"}`;
}

export async function buildInvoiceMessageBody(params: {
  trainerId: string;
  clientName: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  amountPence: number;
  currency?: string;
  paymentDetails: PaymentDetailsForMessage;
}): Promise<string> {
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const amount = formatInvoiceAmount(params.amountPence, params.currency);
  const paymentDetails = formatPaymentOptionsText(params.paymentDetails);
  const { body } = await renderTrainerMessageTemplate(
    params.trainerId,
    "invoice_whatsapp",
    {
      clientName: params.clientName,
      amount,
      slotLabel: sessionLabel,
      paymentDetails,
    },
  );
  return body;
}

export async function buildConfirmationMessageBody(params: {
  trainerId: string;
  clientName: string;
  bookingToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
}): Promise<string> {
  const link = bookingUrl(params.bookingToken);
  const slotLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const { body } = await renderTrainerMessageTemplate(
    params.trainerId,
    "confirmation_whatsapp",
    {
      clientName: params.clientName,
      slotLabel,
      bookingUrl: link,
    },
  );
  return body;
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
  const body = await buildConfirmationMessageBody(params);

  console.log(`[WhatsApp draft → ${params.phone}] ${body}`);

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "confirmation",
    body,
    channel: "whatsapp",
  });
}

export async function sendConfirmationEmail(params: {
  trainerId: string;
  clientId: string;
  email: string;
  bookingToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
  replyTo?: string | null;
}): Promise<WhatsAppDraft> {
  const link = bookingUrl(params.bookingToken);
  const slotLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const rendered = await renderTrainerMessageTemplate(
    params.trainerId,
    "confirmation_email",
    {
      clientName: params.clientName,
      slotLabel,
      bookingUrl: link,
    },
  );
  const body = rendered.body;
  const subject = rendered.subject ?? `Your PT session on ${slotLabel}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 16px;">Session confirmation</h1>
        <p style="font-size:14px;line-height:22px;margin:0 0 16px;white-space:pre-line;">${escapeHtmlPreservingNewlines(body)}</p>
        <p style="margin:0 0 16px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;">
            View session
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
    console.log(`[Confirmation email → ${params.email}] ${subject}\n${body}`);
  }

  return logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.email.trim(),
    messageType: "confirmation",
    body,
    channel: "email",
  });
}

export async function buildLastMinuteOfferBody(params: {
  trainerId: string;
  clientName: string;
  offerToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  lockHours: number;
}): Promise<string> {
  const link = interestUrl(params.offerToken);
  const { body } = await renderTrainerMessageTemplate(
    params.trainerId,
    "last_minute_whatsapp",
    {
      clientName: params.clientName,
      slotLabel: formatSlotLabel(params.slotStartAt, params.slotEndAt),
      lockHoursLabel: lockHoursLabel(params.lockHours),
      offerUrl: link,
    },
  );
  return body;
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
  const body = await buildLastMinuteOfferBody(params);

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
  const link = interestUrl(params.offerToken);
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const rendered = await renderTrainerMessageTemplate(
    params.trainerId,
    "last_minute_email",
    {
      clientName: params.clientName,
      slotLabel: sessionLabel,
      lockHoursLabel: lockHoursLabel(params.lockHours),
      offerUrl: link,
    },
  );
  const body = rendered.body;
  const subject =
    rendered.subject ?? `Last-minute PT slot available: ${sessionLabel}`;

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
  const body = await buildInvoiceMessageBody(params);

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
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const amount = formatInvoiceAmount(params.amountPence, params.currency);
  const paymentDetails = formatPaymentOptionsText(params.paymentDetails);
  const rendered = await renderTrainerMessageTemplate(
    params.trainerId,
    "invoice_email",
    {
      clientName: params.clientName,
      amount,
      slotLabel: sessionLabel,
      paymentDetails,
    },
  );
  const body = rendered.body;
  const subject =
    rendered.subject ?? `Invoice for your PT session on ${sessionLabel}`;

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

export async function buildPortalLinkMessageBody(params: {
  trainerId: string;
  clientName: string;
  portalUrl: string;
}): Promise<string> {
  const { body } = await renderTrainerMessageTemplate(
    params.trainerId,
    "portal_link_whatsapp",
    {
      clientName: params.clientName,
      portalUrl: params.portalUrl,
    },
  );
  return body;
}

export async function sendWhatsAppPortalLink(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  clientName: string;
  portalUrl: string;
}): Promise<WhatsAppDraft> {
  const body = await buildPortalLinkMessageBody(params);
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
  const rendered = await renderTrainerMessageTemplate(
    params.trainerId,
    "portal_link_email",
    {
      clientName: params.clientName,
      portalUrl: params.portalUrl,
    },
  );
  const body = rendered.body;
  const subject = rendered.subject ?? "Your personal training portal link";

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
