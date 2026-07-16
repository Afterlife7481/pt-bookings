import { ensureDb } from "@/lib/db/init";
import { getBookingCalendarPayload } from "@/lib/services/booking-calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  await ensureDb();
  const { token } = await params;
  const payload = await getBookingCalendarPayload(token?.trim() ?? "");

  if (!payload) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(payload.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${payload.filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
