import {
  FEATURE_REQUEST_INBOX,
  FEEDBACK_INBOX,
  type TrainerContactKind,
} from "@/lib/contact";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "PT Bookings <noreply@example.com>";

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends an email via Resend. Returns `false` when no API key is configured
 * (so callers can fall back to logging in local dev). Throws a generic error
 * when delivery is attempted but fails, and logs the provider detail server-side.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!isEmailDeliveryConfigured()) return false;
  const apiKey = process.env.RESEND_API_KEY!.trim();

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });
  } catch (cause) {
    console.error("[email] Resend request failed", cause);
    throw new Error("Failed to send email. Please try again.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend responded ${res.status}: ${detail}`);
    throw new Error("Failed to send email. Please try again.");
  }

  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sends the trainer sign-in / sign-up one-time code.
 * Returns whether an email was delivered (`false` when no provider is configured).
 */
export async function sendTrainerOtpEmail(params: {
  to: string;
  code: string;
  purpose: "signup" | "login";
  expiresInMinutes: number;
}): Promise<boolean> {
  const action =
    params.purpose === "signup"
      ? "Finish creating your account"
      : "Sign in";
  const subject =
    params.purpose === "signup"
      ? "Your PT Bookings sign-up code"
      : "Your PT Bookings sign-in code";
  const safeCode = escapeHtml(params.code);

  const text = [
    `${action} to PT Bookings with this code:`,
    "",
    params.code,
    "",
    "Open the PT Bookings app (or the sign-in page) and enter the code there.",
    `This code expires in ${params.expiresInMinutes} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:20px;margin:0 0 16px;">PT Bookings</h1>
        <p style="font-size:14px;line-height:20px;margin:0 0 20px;">${action} with this one-time code:</p>
        <p style="font-size:32px;letter-spacing:0.2em;font-weight:700;margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${safeCode}</p>
        <p style="font-size:14px;line-height:20px;margin:0 0 16px;">Open the PT Bookings app (or the sign-in page) and enter the code there — you do not need to open a link.</p>
        <p style="font-size:12px;line-height:18px;color:#475569;margin:0;">This code expires in ${params.expiresInMinutes} minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return sendEmail({ to: params.to, subject, html, text });
}

/**
 * Sends a trainer feature request or feedback message to the product inbox.
 * Returns whether delivery was configured (`false` logs locally in dev).
 */
export async function sendTrainerContactEmail(params: {
  kind: TrainerContactKind;
  message: string;
  trainerName: string;
  trainerEmail: string;
}): Promise<boolean> {
  const isFeature = params.kind === "feature_request";
  const to = isFeature ? FEATURE_REQUEST_INBOX : FEEDBACK_INBOX;
  const label = isFeature ? "Feature request" : "Feedback";
  const subject = `${label} from ${params.trainerName || params.trainerEmail}`;
  const safeMessage = escapeHtml(params.message).replace(/\n/g, "<br>");
  const safeName = escapeHtml(params.trainerName || "Trainer");
  const safeEmail = escapeHtml(params.trainerEmail);

  const text = [
    `${label} from ${params.trainerName || "Trainer"} <${params.trainerEmail}>`,
    "",
    params.message,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 12px;">${escapeHtml(label)}</h1>
        <p style="font-size:13px;line-height:18px;color:#475569;margin:0 0 20px;">
          From ${safeName} &lt;${safeEmail}&gt;
        </p>
        <div style="font-size:14px;line-height:22px;white-space:normal;">${safeMessage}</div>
      </td></tr>
    </table>
  </body>
</html>`;

  const delivered = await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo: params.trainerEmail,
  });

  if (!delivered) {
    console.log(`[contact → ${to}] ${subject}\n${params.message}`);
  }

  return delivered;
}

export async function sendLastMinutePruneEmail(params: {
  to: string;
  clientName: string;
  clientToken: string;
  removed: Array<{ dayOfWeek: number; startTime: string }>;
  optedOut: boolean;
}): Promise<boolean> {
  const { dayOfWeekLabel } = await import("@/lib/schedule-grid");
  const { appBaseUrl } = await import("@/lib/constants");
  const prefsUrl = `${appBaseUrl()}/c/${params.clientToken}/last-minute`;
  const removedLines = params.removed.map(
    (slot) => `• ${dayOfWeekLabel(slot.dayOfWeek)} ${slot.startTime}`,
  );
  const subject = "Your last-minute openings were updated";
  const text = [
    `Hi ${params.clientName},`,
    "",
    "Your trainer updated their weekly template, so some of your last-minute opening selections were removed:",
    "",
    ...removedLines,
    "",
    params.optedOut
      ? "You no longer have any last-minute selections, so you have been opted out."
      : "Your remaining selections are unchanged.",
    "",
    `Review or update your preferences: ${prefsUrl}`,
  ].join("\n");

  const safeName = escapeHtml(params.clientName);
  const safeRemoved = removedLines
    .map((line) => `<li>${escapeHtml(line.replace(/^•\s*/, ""))}</li>`)
    .join("");
  const safeUrl = escapeHtml(prefsUrl);
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:18px;margin:0 0 12px;">Last-minute openings updated</h1>
        <p style="font-size:14px;line-height:20px;margin:0 0 16px;">Hi ${safeName}, your trainer updated their weekly template, so some of your last-minute opening selections were removed:</p>
        <ul style="font-size:14px;line-height:22px;margin:0 0 16px;padding-left:20px;">${safeRemoved}</ul>
        <p style="font-size:14px;line-height:20px;margin:0 0 16px;">${
          params.optedOut
            ? "You no longer have any last-minute selections, so you have been opted out."
            : "Your remaining selections are unchanged."
        }</p>
        <p style="margin:0 0 8px;"><a href="${safeUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">Review preferences</a></p>
      </td></tr>
    </table>
  </body>
</html>`;

  const delivered = await sendEmail({
    to: params.to,
    subject,
    html,
    text,
  });
  if (!delivered) {
    console.log(`[prune-notify → ${params.to}]\n${text}`);
  }
  return delivered;
}
