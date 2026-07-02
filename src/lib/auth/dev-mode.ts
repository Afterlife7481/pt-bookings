import { isLocal } from "@/lib/env";

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
