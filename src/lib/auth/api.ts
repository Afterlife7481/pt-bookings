import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getTrainerIdFromSessionToken,
  SESSION_COOKIE,
} from "@/lib/services/auth";

async function getSessionTrainerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  return getTrainerIdFromSessionToken(sessionToken);
}

export async function getTrainerIdFromRequest(): Promise<string | null> {
  return getSessionTrainerId();
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
