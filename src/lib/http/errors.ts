import { NextResponse } from "next/server";

/**
 * Explicit HTTP error for route handlers / services.
 * Prefer this over bare `Error` when status matters (404/409/403).
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const INTERNAL_MESSAGE_RE =
  /duplicate key|violates unique|ECONNREFUSED|ECONNRESET|ENOTFOUND|syntax error|relation .* does not exist|Failed query|column .* does not exist|permission denied for|SSL|certificate/i;

function looksInternal(message: string): boolean {
  return INTERNAL_MESSAGE_RE.test(message);
}

function inferStatus(message: string): number {
  if (/cannot be deleted/i.test(message)) return 403;
  if (/not found/i.test(message)) return 404;
  if (
    /not available|no longer available|already at that time|reserved for another|conflict/i.test(
      message,
    )
  ) {
    return 409;
  }
  return 400;
}

/**
 * Map an unknown thrown value to a JSON error Response.
 * Never forwards driver/internal messages to clients.
 */
export function errorResponse(
  error: unknown,
  fallback = "Request failed",
): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    if (looksInternal(error.message)) {
      console.error("[api]", error);
      return Response.json({ error: fallback }, { status: 500 });
    }
    return Response.json(
      { error: error.message },
      { status: inferStatus(error.message) },
    );
  }

  console.error("[api]", error);
  return Response.json({ error: fallback }, { status: 500 });
}

/** Same mapping as {@link errorResponse}, returning a NextResponse. */
export function nextErrorResponse(
  error: unknown,
  fallback = "Request failed",
): NextResponse {
  const res = errorResponse(error, fallback);
  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
