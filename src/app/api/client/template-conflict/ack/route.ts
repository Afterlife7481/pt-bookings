import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
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
    return errorResponse(error, "Failed to acknowledge");
  }
}
