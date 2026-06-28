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

async function logWhatsAppMessage(params: {
  trainerId: string;
  clientId?: string;
  phone: string;
  messageType: "confirmation" | "last_minute" | "interest_ack";
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
  clientName: string;
}) {
  const link = bookingUrl(params.bookingToken);
  const body = `Hi ${params.clientName}, your PT session is confirmed for ${formatSlotLabel(params.slotStartAt)}. View details and manage your booking: ${link}`;

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
  clientName: string;
  lockHours: number;
}) {
  const link = interestClaimUrl(params.slotId, params.clientId);
  const body = `Hi ${params.clientName}, a last-minute slot opened: ${formatSlotLabel(params.slotStartAt)}. You have ${params.lockHours} hour${params.lockHours === 1 ? "" : "s"} to accept. Tap to book: ${link}`;

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
  clientName: string;
}) {
  const body = `Thanks ${params.clientName}! Your trainer has been notified of your interest in ${formatSlotLabel(params.slotStartAt)}.`;

  console.log(`[WhatsApp → ${params.phone}] ${body}`);

  await logWhatsAppMessage({
    trainerId: params.trainerId,
    clientId: params.clientId,
    phone: params.phone,
    messageType: "interest_ack",
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
