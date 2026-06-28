import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureDb } from "@/lib/db/init";
import {
  deleteTrainerSession,
  SESSION_COOKIE,
} from "@/lib/services/auth";

export async function POST() {
  await ensureDb();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await deleteTrainerSession(sessionToken);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
