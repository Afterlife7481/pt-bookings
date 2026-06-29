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

async function logWhatsAppMessage(params: {
  trainerId: string;
  clientId?: string;
  phone: string;
  messageType: "confirmation" | "last_minute" | "interest_ack" | "invoice";
  body: string;
}) {
  const db = getDb();
  await db.insert(whatsappMessages).values({
    id: nanoid(),
    trainerId: params.trainerId,
    clientId: params.clientId ?? null,
    phone: params.phone,
    messageType: params.messageType,
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
  const body = `Hi ${params.clientName}, your PT session is confirmed for ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. View details and manage your booking: ${link}`;

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
  const body = `Hi ${params.clientName}, a last-minute slot opened: ${formatSlotLabel(params.slotStartAt, params.slotEndAt)}. You have ${params.lockHours} hour${params.lockHours === 1 ? "" : "s"} to accept. View and accept: ${link}`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "last_minute",
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
