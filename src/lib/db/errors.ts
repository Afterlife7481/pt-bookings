/** Postgres unique_violation — used as the real double-booking guard. */
export const PG_UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 6 && current; i++) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code: unknown }).code === PG_UNIQUE_VIOLATION
    ) {
      return true;
    }
    if (
      typeof current === "object" &&
      current !== null &&
      "cause" in current
    ) {
      current = (current as { cause: unknown }).cause;
      continue;
    }
    break;
  }

  return (
    error instanceof Error &&
    /duplicate key value violates unique constraint/i.test(error.message)
  );
}

/** Re-throw unique violations as a stable domain error; rethrow everything else. */
export function mapUniqueViolation(error: unknown, message: string): never {
  if (isUniqueViolation(error)) {
    throw new Error(message);
  }
  throw error;
}
