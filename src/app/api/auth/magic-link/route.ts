import { ensureDb } from "@/lib/db/init";
import { shouldExposeMagicLinks } from "@/lib/auth/dev-mode";
import { requestMagicLink } from "@/lib/services/auth";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const ipLimited = enforceRateLimit(ip, {
    scope: "magic-link:ip",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (ipLimited) return ipLimited;

  const body = await request.json();
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

  if (email) {
    const emailLimited = enforceRateLimit(email, {
      scope: "magic-link:email",
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });
    if (emailLimited) return emailLimited;
  }

  try {
    const result = await requestMagicLink({
      email: body.email,
      name: body.name,
      purpose: body.purpose === "signup" ? "signup" : "login",
    });
    return Response.json({
      ok: true,
      message: shouldExposeMagicLinks()
        ? "Use the link below to sign in."
        : "Check your email for a sign-in link.",
      devLink: shouldExposeMagicLinks() ? result.url : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send magic link";
    return Response.json({ error: message }, { status: 400 });
  }
}
