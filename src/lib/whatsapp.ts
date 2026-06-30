import { nanoid } from "nanoid";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { whatsappMessages } from "@/lib/db/schema";
import {
  bookingUrl,
  formatSlotLabel,
  interestClaimUrl,
  nowIso,
} from "@/lib/constants";
import {
  formatInvoiceAmount,
  formatPaymentOptionsText,
  type PaymentDetailsForMessage,
} from "@/lib/payments";

type WhatsAppMessageType =
  | "confirmation"
  | "last_minute"
  | "interest_ack"
  | "invoice"
  | "last_minute_accepted"
  | "last_minute_declined"
  | "session_canceled"
  | "session_changed";

async function logWhatsAppMessage(params: {
  trainerId: string;
  clientId?: string;
  phone: string;
  messageType: WhatsAppMessageType;
  recipient?: "client" | "trainer";
  body: string;
}) {
  const db = getDb();
  await db.insert(whatsappMessages).values({
    id: nanoid(),
    trainerId: params.trainerId,
    clientId: params.clientId ?? null,
    phone: params.phone,
    messageType: params.messageType,
    recipient: params.recipient ?? "client",
    body: params.body,
    status: "sent",
    createdAt: nowIso(),
  });
}

export async function sendWhatsAppConfirmation(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  bookingToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
}) {
  const link = bookingUrl(params.bookingToken);
  const body = `Hi ${params.clientName}, your PT session is booked for ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. View details and manage your booking: ${link}`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "confirmation",
    body,
  });
}

export async function sendWhatsAppLastMinute(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  slotId: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
  lockHours: number;
}) {
  const link = interestClaimUrl(params.slotId, params.clientId);
  const body = `Hi ${params.clientName}, a last-minute slot opened: ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. You have ${params.lockHours} hour${params.lockHours === 1 ? "" : "s"} to accept or decline. View offer: ${link}`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "last_minute",
    body,
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

  console.log(`[WhatsApp → trainer ${params.trainerEmail}] ${body}`);

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

  console.log(`[WhatsApp → trainer ${params.trainerEmail}] ${body}`);

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

  console.log(`[WhatsApp → trainer ${params.trainerEmail}] ${body}`);

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

  console.log(`[WhatsApp → trainer ${params.trainerEmail}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.trainerEmail,
    messageType: "session_changed",
    recipient: "trainer",
    body,
  });
}

export async function sendWhatsAppSessionChangedToClient(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  clientName: string;
  bookingToken: string;
  slotStartAt: string;
  slotEndAt?: string | null;
}) {
  const link = bookingUrl(params.bookingToken);
  const body = `Hi ${params.clientName}, your PT session has been changed to ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. View details and manage your booking: ${link}`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "session_changed",
    body,
  });
}

export async function sendWhatsAppInterestAck(params: {
  trainerId: string;
  clientId: string;
  phone: string;
  slotStartAt: string;
  slotEndAt?: string | null;
  clientName: string;
}) {
  const body = `Thanks ${params.clientName}! Your trainer has been notified of your interest in ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}.`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "interest_ack",
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
  paymentDetails: PaymentDetailsForMessage;
}) {
  const sessionLabel = formatSlotLabel(params.slotStartAt, params.slotEndAt);
  const amount = formatInvoiceAmount(params.amountPence);
  const paymentLines = formatPaymentOptionsText(params.paymentDetails);

  const body = `Hi ${params.clientName}, please pay ${amount} for your PT session on ${sessionLabel}.\n\n${paymentLines}`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "invoice",
    body,
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
