import type { NextRequest } from "next/server";
import { SESSION_COOKIE, appBaseUrl } from "@/lib/constants";

export const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/me",
  "/api/auth/magic-link",
  "/api/auth/logout",
  "/api/change",
  "/api/client-book",
  "/api/client/sessions/cancel",
  "/api/client/last-minute/accept",
  "/api/client/last-minute/decline",
  "/api/opt-in",
] as const;

export function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isTrainerApiPath(pathname: string) {
  return pathname.startsWith("/api/") && !isPublicApiPath(pathname);
}

export async function hasValidTrainerSession(
  request: NextRequest,
): Promise<boolean> {
  const cookie = request.headers.get("cookie");
  if (!cookie?.includes(`${SESSION_COOKIE}=`)) return false;

  try {
    const url = new URL("/api/auth/me", appBaseUrl());
    const res = await fetch(url, {
      headers: { cookie },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
