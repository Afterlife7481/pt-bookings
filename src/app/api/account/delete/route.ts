import { NextResponse } from "next/server";
import { nextErrorResponse } from "@/lib/http/errors";
import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { deleteTrainerAccount } from "@/lib/services/account-deletion";
import { SESSION_COOKIE } from "@/lib/services/auth";
import { clearSessionCookieOptions } from "@/lib/auth/session-cookie";

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const confirmationEmail = body.email?.trim();
  if (!confirmationEmail) {
    return NextResponse.json(
      { error: "Enter your email address to confirm deletion." },
      { status: 400 },
    );
  }

  try {
    await deleteTrainerAccount(trainerId, confirmationEmail);
  } catch (e) {
    return nextErrorResponse(e, "Failed to delete account");
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", clearSessionCookieOptions());
  return response;
}
