/** Show magic-link URL in the UI (no real email yet). */
export function shouldExposeMagicLinks(): boolean {
  if (process.env.EXPOSE_DEV_MAGIC_LINKS === "0") return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.EXPOSE_DEV_MAGIC_LINKS === "1") return true;
  // Beta on Railway: expose links until email delivery is wired up.
  if (process.env.RAILWAY_SERVICE_ID) return true;
  return false;
}
