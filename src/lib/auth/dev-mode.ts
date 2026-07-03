import { isLocal, isProduction } from "@/lib/env";

/**
 * Whether to reveal the magic-link URL (and DB host) in API responses.
 *
 * Only the local tier exposes links; staging and production always deliver
 * sign-in by email. On the local tier it can be turned off explicitly with
 * EXPOSE_DEV_MAGIC_LINKS=0.
 */
export function shouldExposeMagicLinks(): boolean {
  if (!isLocal()) return false;
  if (process.env.EXPOSE_DEV_MAGIC_LINKS === "0") return false;
  return true;
}

/** Emails allowed to see the magic link on screen even on the staging tier. */
function magicLinkDebugEmails(): Set<string> {
  const raw = process.env.MAGIC_LINK_DEBUG_EMAILS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Whether the magic link should be shown to the requester of a specific email.
 *
 * - Local tier: always (subject to EXPOSE_DEV_MAGIC_LINKS).
 * - Production: never — email delivery only (preserves the SEC-1 guarantee).
 * - Staging: only for emails listed in MAGIC_LINK_DEBUG_EMAILS, so a known
 *   test account can sign in while real email delivery is still being set up.
 */
export function shouldExposeMagicLinkForEmail(
  email: string | undefined,
): boolean {
  if (shouldExposeMagicLinks()) return true;
  if (isProduction()) return false;
  if (!email) return false;
  return magicLinkDebugEmails().has(email.toLowerCase().trim());
}
