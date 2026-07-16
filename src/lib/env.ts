/**
 * Deployment tier for the running app.
 *
 * This is intentionally separate from `NODE_ENV`. `NODE_ENV` only tells you
 * whether the build is optimized (`development` vs `production`) — every
 * deployed build (staging AND production) runs with `NODE_ENV=production`.
 * `APP_ENV` names the actual environment so behaviour can differ per tier.
 */
export type AppEnv = "local" | "staging" | "production";

export function appEnv(): AppEnv {
  const raw = process.env.APP_ENV?.trim().toLowerCase();
  if (raw === "local" || raw === "staging" || raw === "production") {
    return raw;
  }

  // No explicit APP_ENV: infer from NODE_ENV.
  // `next dev` runs with NODE_ENV=development → local.
  if (process.env.NODE_ENV === "development") return "local";

  // A deployed build with APP_ENV unset defaults to the most locked-down tier.
  return "production";
}

export function isLocal(): boolean {
  return appEnv() === "local";
}

export function isProduction(): boolean {
  return appEnv() === "production";
}
