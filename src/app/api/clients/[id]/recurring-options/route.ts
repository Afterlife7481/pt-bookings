import { ensureDb } from "@/lib/db/init";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { getRecurringSlotOptions } from "@/lib/services/clients";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDb();
  const { id } = await params;
  const options = await getRecurringSlotOptions(DEFAULT_TRAINER_ID, id);
  return Response.json(options);
}
