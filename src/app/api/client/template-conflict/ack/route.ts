import { ensureDb } from "@/lib/db/init";
import { acknowledgeScheduleConflict } from "@/lib/services/template-conflicts";

export async function POST(request: Request) {
  await ensureDb();

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const result = await acknowledgeScheduleConflict(token);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to acknowledge";
    return Response.json({ error: message }, { status: 400 });
  }
}
