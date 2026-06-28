import { ensureDb } from "@/lib/db/init";
import { requestMagicLink } from "@/lib/services/auth";

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();

  try {
    const result = await requestMagicLink({
      email: body.email,
      name: body.name,
      purpose: body.purpose === "signup" ? "signup" : "login",
    });
    return Response.json({
      ok: true,
      message: "Check your email for a sign-in link.",
      devLink: process.env.NODE_ENV === "development" ? result.url : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send magic link";
    return Response.json({ error: message }, { status: 400 });
  }
}
