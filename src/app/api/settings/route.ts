import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import {
  getTrainerSettings,
  updateTrainerSettings,
} from "@/lib/services/settings";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const settings = await getTrainerSettings(trainerId);
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    await updateTrainerSettings(trainerId, {
      scheduleStartTime: body.scheduleStartTime,
      scheduleEndTime: body.scheduleEndTime,
      scheduleDefaultView: body.scheduleDefaultView,
      timezone: body.timezone,
      cancelDeadlineHours:
        body.cancelDeadlineHours !== undefined
          ? Number(body.cancelDeadlineHours)
          : undefined,
      lastMinuteOfferLockHours:
        body.lastMinuteOfferLockHours !== undefined
          ? Number(body.lastMinuteOfferLockHours)
          : undefined,
      clientBookingWindowWeeks:
        body.clientBookingWindowWeeks !== undefined
          ? Number(body.clientBookingWindowWeeks)
          : undefined,
      bankAccountNumber: body.bankAccountNumber,
      bankSortCode: body.bankSortCode,
      bankName: body.bankName,
      paymentPayeeName: body.paymentPayeeName,
    });
    const settings = await getTrainerSettings(trainerId);
    return Response.json(settings);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save settings";
    return Response.json({ error: message }, { status: 400 });
  }
}
