import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  cancelBookingForTrainer,
  createBookingForSlot,
  getBookingDetailForTrainer,
  listBookings,
  sendConfirmationForBooking,
} from "@/lib/services/bookings";

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

  try {
    if (body.action === "cancel") {
      await cancelBookingForTrainer(trainerId, body.bookingId);
      return Response.json({ ok: true });
    }

    if (body.action === "allocate") {
      const result = await createBookingForSlot({
        slotId: body.slotId,
        clientId: body.clientId,
        trainerId,
        isRecurring: false,
        sendConfirmation: false,
        locationValidation: "trainer",
      });
      return Response.json(result);
    }

    if (body.action === "send_confirmation") {
      // Confirm the booking belongs to this trainer before acting on it.
      const owned = await getBookingDetailForTrainer(trainerId, body.bookingId);
      if (!owned) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      const detail = await sendConfirmationForBooking(
        body.bookingId,
        body.channels,
      );
      if (!detail) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      return Response.json(detail);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errorResponse(e, "Action failed");
  }
}
