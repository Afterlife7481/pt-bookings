import { ensureDb } from "@/lib/db/init";
import {
  getClientLastMinutePreferences,
  setClientLastMinutePreferences,
  type LastMinuteSlotRef,
} from "@/lib/services/last-minute";
import { getClientByToken } from "@/lib/services/clients";
import { getTrainerSettings } from "@/lib/services/settings";

export async function GET(request: Request) {
  await ensureDb();
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  const client = await getClientByToken(token);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const settings = await getTrainerSettings(client.trainerId);
  const preferences = await getClientLastMinutePreferences(client.id);

  return Response.json({
    optIn: client.lastMinuteOptIn,
    preferences,
    scheduleStartTime: settings.scheduleStartTime,
    scheduleEndTime: settings.scheduleEndTime,
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const body = await request.json();
  const token = body.token as string | undefined;
  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  const client = await getClientByToken(token);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const preferences = (body.preferences ?? []) as LastMinuteSlotRef[];
    if (body.optIn === false || preferences.length === 0) {
      await setClientLastMinutePreferences(client.id, client.trainerId, []);
    } else {
      await setClientLastMinutePreferences(
        client.id,
        client.trainerId,
        preferences,
      );
    }

    const updated = await getClientLastMinutePreferences(client.id);
    return Response.json({
      ok: true,
      optIn: updated.length > 0,
      preferences: updated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save preferences";
    return Response.json({ error: message }, { status: 400 });
  }
}
