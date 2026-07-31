import { isLocal } from "@/lib/env";

/**
 * Slot civil-time helpers assume a UTC process clock on the server.
 * Fail closed in deployed environments if the host TZ drifts.
 */
export function assertUtcProcessTimezone() {
  if (isLocal()) return;
  if (new Date().getTimezoneOffset() !== 0) {
    throw new Error(
      "Process timezone must be UTC (set TZ=UTC). Civil slot arithmetic depends on it.",
    );
  }
}
