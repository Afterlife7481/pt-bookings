import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { getBookingDetailForTrainer } from "@/lib/services/bookings";
import { listAvailableSlotsForTrainerChange } from "@/lib/services/change";
import { getTrainerSettings } from "@/lib/services/settings";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await context.params;
  const existing = await getBookingDetailForTrainer(trainerId, id);
  if (!existing) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const [slots, settings] = await Promise.all([
      listAvailableSlotsForTrainerChange(trainerId, id),
      getTrainerSettings(trainerId),
    ]);
    return Response.json({
      slots,
      bookingWindowWeeks: settings.clientBookingWindowWeeks,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load slots";
    return Response.json({ error: message }, { status: 400 });
  }
}
