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
};

/**
 * Sends an email via Resend. Returns `false` when no API key is configured
 * (so callers can fall back to logging in local dev). Throws a generic error
 * when delivery is attempted but fails, and logs the provider detail server-side.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

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
 * Sends the trainer sign-in / sign-up magic link. Returns whether an email was
 * actually delivered (`false` when no provider is configured).
 */
export async function sendMagicLinkEmail(params: {
  to: string;
  url: string;
  purpose: "signup" | "login";
  expiresInMinutes: number;
}): Promise<boolean> {
  const action = params.purpose === "signup" ? "Finish creating your account" : "Sign in";
  const subject =
    params.purpose === "signup"
      ? "Confirm your PT Bookings account"
      : "Your PT Bookings sign-in link";
  const safeUrl = escapeHtml(params.url);

  const text = [
    `${action} to PT Bookings using the link below:`,
    "",
    params.url,
    "",
    `This link expires in ${params.expiresInMinutes} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td>
        <h1 style="font-size:20px;margin:0 0 16px;">PT Bookings</h1>
        <p style="font-size:14px;line-height:20px;margin:0 0 20px;">${action} to PT Bookings using the button below.</p>
        <p style="margin:0 0 24px;">
          <a href="${safeUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">${action}</a>
        </p>
        <p style="font-size:12px;line-height:18px;color:#475569;margin:0 0 8px;">Or paste this link into your browser:</p>
        <p style="font-size:12px;line-height:18px;word-break:break-all;margin:0 0 24px;"><a href="${safeUrl}" style="color:#2563eb;">${safeUrl}</a></p>
        <p style="font-size:12px;line-height:18px;color:#475569;margin:0;">This link expires in ${params.expiresInMinutes} minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return sendEmail({ to: params.to, subject, html, text });
}
