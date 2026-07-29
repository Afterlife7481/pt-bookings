import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  deletePaymentMethod,
  updatePaymentMethod,
} from "@/lib/services/payment-methods";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  try {
    const method = await updatePaymentMethod(trainerId, id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.note !== undefined && { note: body.note }),
    });
    return Response.json(method);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update payment method";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;

  try {
    await deletePaymentMethod(trainerId, id);
    return Response.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to delete payment method";
    return Response.json({ error: message }, { status: 400 });
  }
}
