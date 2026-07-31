import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  createPaymentMethod,
  listPaymentMethods,
} from "@/lib/services/payment-methods";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const rows = await listPaymentMethods(trainerId);
  return Response.json(rows);
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    const method = await createPaymentMethod(trainerId, {
      name: body.name ?? "",
      note: body.note,
    });
    return Response.json(method, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Failed to create payment method");
  }
}
