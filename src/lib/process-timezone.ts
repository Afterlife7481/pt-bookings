import { isLocal } from "@/lib/env";

/**
 * Slot civil-time helpers assume a UTC process clock on the server.
 * Prefer `TZ=UTC` in the process environment (see package.json scripts).
 * We warn instead of throwing so a misconfigured host does not white-screen the app.
 */
export function assertUtcProcessTimezone() {
  if (isLocal()) return;
  if (new Date().getTimezoneOffset() !== 0) {
    console.error(
      "Process timezone must be UTC (set TZ=UTC). Civil slot arithmetic depends on it. " +
        `Current timezoneOffset=${new Date().getTimezoneOffset()}`,
    );
  }
}
