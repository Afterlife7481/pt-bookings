import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, appUrl } from "@/lib/constants";
import {
  hasValidTrainerSession,
  isPublicApiPath,
  isTrainerApiPath,
} from "@/lib/auth/middleware";

function redirectToLogin(request: NextRequest) {
  const loginUrl = appUrl("/login");
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE);

  if (pathname.startsWith("/dashboard")) {
    if (!session?.value) {
      return redirectToLogin(request);
    }

    if (process.env.E2E_TEST === "1") {
      return NextResponse.next();
    }

    const valid = await hasValidTrainerSession(request);
    if (!valid) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }

  if (isTrainerApiPath(pathname)) {
    if (!session?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Route handlers validate the session token against the database.
    // Avoid an extra HTTP round-trip here — especially slow in local dev.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/api/:path*"],
};
