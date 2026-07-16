import { NextResponse } from "next/server";
import { appUrl } from "@/lib/constants";

/** Trainer magic links are replaced by email OTP. */
export async function GET() {
  return NextResponse.redirect(appUrl("/login?error=otp"));
}
