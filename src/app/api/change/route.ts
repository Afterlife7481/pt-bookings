import { ensureDb } from "@/lib/db/init";
import { startChangeRequest, confirmChange } from "@/lib/services/change";

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();

  try {
    if (body.action === "start") {
      const result = await startChangeRequest(body.bookingToken);
      return Response.json(result);
    }

    if (body.action === "confirm") {
      const result = await confirmChange(body.changeRequestId, body.toSlotId);
      return Response.json(result);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return Response.json({ error: message }, { status: 400 });
  }
}
