import { ensureDb } from "@/lib/db/init";
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
    });
    return Response.json(method, { status: 201 });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to create payment method";
    return Response.json({ error: message }, { status: 400 });
  }
}
