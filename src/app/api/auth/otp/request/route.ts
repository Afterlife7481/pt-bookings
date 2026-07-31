import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { requestTrainerOtp } from "@/lib/services/auth";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const ipLimited = await enforceRateLimit(ip, {
    scope: "trainer-otp-request:ip",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (ipLimited) return ipLimited;

  const body = await request.json();
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

  if (email) {
    const emailLimited = await enforceRateLimit(email, {
      scope: "trainer-otp-request:email",
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });
    if (emailLimited) return emailLimited;
  }

  try {
    const result = await requestTrainerOtp({
      email: body.email,
      name: body.name,
      purpose: body.purpose === "signup" ? "signup" : "login",
      inviteCode:
        typeof body.inviteCode === "string" ? body.inviteCode : undefined,
    });
    return Response.json({
      ok: true,
      message: result.exposeCode
        ? "Use the code below to continue."
        : "Check your email for a 6-digit code.",
      expiresInMinutes: result.expiresInMinutes,
      devCode: result.devCode,
    });
  } catch (e) {
    return errorResponse(e, "Failed to send code");
  }
}
