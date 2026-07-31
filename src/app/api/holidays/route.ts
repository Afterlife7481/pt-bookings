import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { createHoliday, listHolidays } from "@/lib/services/holidays";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const rows = await listHolidays(trainerId);
  return Response.json(rows);
}

export async function POST(request: Request) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const body = await request.json();

  try {
    const holiday = await createHoliday(trainerId, {
      startAt: body.startAt ?? "",
      endAt: body.endAt ?? "",
      label: body.label,
    });
    return Response.json(holiday, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Failed to create time off");
  }
}
