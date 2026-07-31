import { isLocal } from "@/lib/env";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** Shared options for the trainer `pt_session` cookie. */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    // Local HTTP (`next dev`) cannot set Secure cookies.
    secure: !isLocal(),
  };
}

export function clearSessionCookieOptions() {
  return sessionCookieOptions(0);
}

export { SESSION_MAX_AGE };
