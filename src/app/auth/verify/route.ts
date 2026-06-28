import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/init";
import {
  createTrainerSession,
  SESSION_COOKIE,
  verifyMagicLink,
} from "@/lib/services/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing", request.url));
  }

  try {
    const trainerId = await verifyMagicLink(token);
    const session = await createTrainerSession(trainerId);
    const response = NextResponse.redirect(new URL("/dashboard/schedule", request.url));
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }
}
