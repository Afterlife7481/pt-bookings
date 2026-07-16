import { NextResponse } from "next/server";

/** @deprecated Use GET /api/feed */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/api/feed", request.url));
}
