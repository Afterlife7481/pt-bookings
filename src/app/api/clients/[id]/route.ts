import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  getClientDetail,
  updateClient,
  setRecurringPreferences,
  type RecurringSlotRef,
} from "@/lib/services/clients";
import { setClientLocations } from "@/lib/services/locations";
import { parseSessionPriceInput } from "@/lib/utils";

function sessionPriceFromBody(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Session price must be zero or greater");
    }
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    return parseSessionPriceInput(value);
  }
  throw new Error("Invalid session price");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const { id } = await params;
  const client = await getClientDetail(trainerId, id);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  return Response.json(client);
}

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
    const detailUpdates: {
      name?: string;
      phone?: string;
      email?: string;
      lastMinuteOptIn?: boolean;
      sessionPrice?: number | null;
    } = {};

    if (body.name !== undefined) detailUpdates.name = body.name;
    if (body.phone !== undefined) detailUpdates.phone = body.phone;
    if (body.email !== undefined) detailUpdates.email = body.email;
    if (typeof body.lastMinuteOptIn === "boolean") {
      detailUpdates.lastMinuteOptIn = body.lastMinuteOptIn;
    }
    if ("sessionPrice" in body) {
      detailUpdates.sessionPrice = sessionPriceFromBody(body.sessionPrice);
    }

    if (Object.keys(detailUpdates).length > 0) {
      await updateClient(trainerId, id, detailUpdates);
    }

    if ("recurringSlots" in body) {
      await setRecurringPreferences(
        id,
        trainerId,
        body.recurringSlots as RecurringSlotRef[],
      );
    } else if ("recurring" in body) {
      await setRecurringPreferences(
        id,
        trainerId,
        body.recurring ? [body.recurring] : [],
      );
    }

    if ("locationIds" in body) {
      await setClientLocations(
        trainerId,
        id,
        Array.isArray(body.locationIds) ? body.locationIds : [],
      );
    }

    const client = await getClientDetail(trainerId, id);
    return Response.json(client);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update client";
    return Response.json({ error: message }, { status: 400 });
  }
}
