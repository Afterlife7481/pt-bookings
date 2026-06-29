import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { parseSessionPaymentType } from "@/lib/constants";
import {
  cancelBookingForTrainer,
  getBookingDetailForTrainer,
  sendConfirmationForBooking,
  sendInvoiceForBooking,
  updateBookingPaymentForTrainer,
  voidBookingForTrainer,
} from "@/lib/services/bookings";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await context.params;
  const detail = await getBookingDetailForTrainer(trainerId, id);
  if (!detail) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json(detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await context.params;
  const body = await request.json();

  const existing = await getBookingDetailForTrainer(trainerId, id);
  if (!existing) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const updates: {
      sessionPaid?: boolean;
      paymentType?: ReturnType<typeof parseSessionPaymentType>;
    } = {};

    if ("sessionPaid" in body) {
      if (typeof body.sessionPaid !== "boolean") {
        return Response.json(
          { error: "sessionPaid must be a boolean" },
          { status: 400 },
        );
      }
      updates.sessionPaid = body.sessionPaid;
    }

    if ("paymentType" in body) {
      updates.paymentType = parseSessionPaymentType(body.paymentType);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No updates provided" }, { status: 400 });
    }

    const detail = await updateBookingPaymentForTrainer(trainerId, id, updates);

    if (!detail) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json(detail);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update session";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await context.params;
  const body = await request.json();

  const existing = await getBookingDetailForTrainer(trainerId, id);
  if (!existing) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    if (body.action === "cancel") {
      await cancelBookingForTrainer(trainerId, id);
      return Response.json({ ok: true });
    }

    if (body.action === "send_confirmation") {
      await sendConfirmationForBooking(id);
      return Response.json({ ok: true });
    }

    if (body.action === "send_invoice") {
      const detail = await sendInvoiceForBooking(id);
      if (!detail) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      return Response.json(detail);
    }

    if (body.action === "void") {
      const detail = await voidBookingForTrainer(trainerId, id);
      if (!detail) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      return Response.json(detail);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
