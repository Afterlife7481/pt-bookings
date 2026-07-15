import { createHash, randomInt } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { clientEmailVerifications, clients } from "@/lib/db/schema";
import { addMinutes, nowIso } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { hasClientEmail } from "@/lib/notify-channels";

const CODE_TTL_MINUTES = 15;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeClientEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function assertValidClientEmail(email: string): string {
  const normalized = normalizeClientEmail(email);
  if (!hasClientEmail(normalized)) {
    throw new Error("Enter a valid email address");
  }
  if (normalized.length > 200) {
    throw new Error("Email address is too long");
  }
  return normalized;
}

function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

export async function requestClientEmailVerification(params: {
  clientId: string;
  email: string;
}): Promise<{ delivered: boolean; devCode?: string }> {
  const email = assertValidClientEmail(params.email);
  const db = getDb();
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, params.clientId),
  });
  if (!client) throw new Error("Client not found");

  if (normalizeClientEmail(client.email) === email) {
    throw new Error("That email is already saved on your profile");
  }

  const code = generateVerificationCode();
  const ts = nowIso();
  await db.insert(clientEmailVerifications).values({
    id: nanoid(),
    clientId: params.clientId,
    email,
    codeHash: hashVerificationCode(code),
    expiresAt: addMinutes(ts, CODE_TTL_MINUTES),
    createdAt: ts,
  });

  const subject = "Confirm your email for PT Bookings";
  const text = [
    `Hi ${client.name},`,
    "",
    `Your verification code is: ${code}`,
    "",
    `This code expires in ${CODE_TTL_MINUTES} minutes.`,
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const safeName = escapeHtml(client.name);
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 12px;">Confirm your email</h1>
        <p style="font-size:14px;line-height:20px;margin:0 0 16px;">Hi ${safeName}, use this code to confirm your email for PT Bookings:</p>
        <p style="font-size:28px;letter-spacing:0.2em;font-weight:700;margin:0 0 16px;">${code}</p>
        <p style="font-size:12px;line-height:18px;color:#475569;margin:0;">This code expires in ${CODE_TTL_MINUTES} minutes. If you did not request this, ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const delivered = await sendEmail({ to: email, subject, html, text });
  if (!delivered) {
    console.log(`[client-email-verify → ${email}] code ${code}`);
  }

  return {
    delivered,
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
  };
}

export async function verifyClientEmailCode(params: {
  clientId: string;
  email: string;
  code: string;
}): Promise<void> {
  const email = assertValidClientEmail(params.email);
  const code = params.code.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter the 6-digit code from your email");
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(clientEmailVerifications)
    .where(
      and(
        eq(clientEmailVerifications.clientId, params.clientId),
        eq(clientEmailVerifications.email, email),
        isNull(clientEmailVerifications.usedAt),
      ),
    )
    .orderBy(desc(clientEmailVerifications.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error("No verification code found. Request a new code.");
  }
  if (row.expiresAt <= nowIso()) {
    throw new Error("That code has expired. Request a new one.");
  }
  if (row.codeHash !== hashVerificationCode(code)) {
    throw new Error("That code is incorrect");
  }

  const ts = nowIso();
  await db
    .update(clientEmailVerifications)
    .set({ usedAt: ts })
    .where(eq(clientEmailVerifications.id, row.id));

  await db
    .update(clients)
    .set({ email })
    .where(eq(clients.id, params.clientId));
}

export async function setClientLastMinutePruneNotify(
  clientId: string,
  enabled: boolean,
) {
  const db = getDb();
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) throw new Error("Client not found");
  if (enabled && !hasClientEmail(client.email)) {
    throw new Error("Add and verify your email before enabling notifications");
  }
  await db
    .update(clients)
    .set({ lastMinutePruneNotify: enabled })
    .where(eq(clients.id, clientId));
}
