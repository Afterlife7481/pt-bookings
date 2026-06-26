import { ensureDb } from "@/lib/db/init";
import {
  updateClientLastMinuteOptIn,
  setRecurringPreferences,
  type RecurringSlotRef,
} from "@/lib/services/clients";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const { id } = await params;
  const body = await request.json();

  try {
    if (typeof body.lastMinuteOptIn === "boolean") {
      await updateClientLastMinuteOptIn(id, body.lastMinuteOptIn);
    }

    if ("recurringSlots" in body) {
      await setRecurringPreferences(
        id,
        DEFAULT_TRAINER_ID,
        body.recurringSlots as RecurringSlotRef[],
      );
    } else if ("recurring" in body) {
      await setRecurringPreferences(
        id,
        DEFAULT_TRAINER_ID,
        body.recurring ? [body.recurring] : [],
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update client";
    return Response.json({ error: message }, { status: 400 });
  }
}
