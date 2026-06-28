import { cookies } from "next/headers";
import {
  getTrainerIdFromSessionToken,
  SESSION_COOKIE,
} from "@/lib/services/auth";

export async function getCurrentTrainerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  return getTrainerIdFromSessionToken(sessionToken);
}

export async function requireTrainerId(): Promise<string> {
  const trainerId = await getCurrentTrainerId();
  if (!trainerId) {
    throw new Error("Unauthorized");
  }
  return trainerId;
}
