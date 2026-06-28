import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { listBookings } from "@/lib/services/templates";
import {
  cancelBooking,
  createBookingForSlot,
  sendConfirmationForBooking,
} from "@/lib/services/bookings";
import { toggleBookingOverride36h } from "@/lib/services/clients";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const bookings = await listBookings(trainerId);
  return Response.json(bookings);
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  if (body.action === "cancel") {
    await cancelBooking(body.bookingId);
    return Response.json({ ok: true });
  }

  if (body.action === "allocate") {
    try {
      const result = await createBookingForSlot({
        slotId: body.slotId,
        clientId: body.clientId,
        trainerId,
        isRecurring: false,
        sendConfirmation: true,
      });
      return Response.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to allocate slot";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  if (body.action === "send_confirmation") {
    await sendConfirmationForBooking(body.bookingId);
    return Response.json({ ok: true });
  }

  if (body.action === "toggle_override_36h") {
    await toggleBookingOverride36h(body.bookingId);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
