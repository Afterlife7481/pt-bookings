import { ensureDb } from "@/lib/db/init";

export async function GET() {
  await ensureDb();
  return Response.json({ ok: true });
}
