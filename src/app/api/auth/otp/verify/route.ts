import { NextResponse } from "next/server";
import { nextErrorResponse } from "@/lib/http/errors";
import { ensureDb } from "@/lib/db/init";
import {
  createTrainerSession,
  SESSION_COOKIE,
  verifyTrainerOtp,
} from "@/lib/services/auth";
import {
  SESSION_MAX_AGE,
  sessionCookieOptions,
} from "@/lib/auth/session-cookie";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureDb();

  const ip = getRequestIp(request);
  const ipLimited = await enforceRateLimit(ip, {
    scope: "trainer-otp-verify:ip",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (ipLimited) return ipLimited;

  const body = await request.json();
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const code = typeof body.code === "string" ? body.code : "";

  if (email) {
    const emailLimited = await enforceRateLimit(email, {
      scope: "trainer-otp-verify:email",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (emailLimited) return emailLimited;
  }

  try {
    const trainerId = await verifyTrainerOtp({ email, code });
    const session = await createTrainerSession(trainerId);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      session.token,
      sessionCookieOptions(SESSION_MAX_AGE),
    );
    return response;
  } catch (e) {
    return nextErrorResponse(e, "Failed to verify code");
  }
}
