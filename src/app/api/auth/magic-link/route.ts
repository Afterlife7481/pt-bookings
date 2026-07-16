/** @deprecated Use /api/auth/otp/request — trainer auth is OTP-only. */
export async function POST() {
  return Response.json(
    {
      error:
        "Trainer sign-in now uses a one-time code. Reload the page and try again.",
    },
    { status: 410 },
  );
}
