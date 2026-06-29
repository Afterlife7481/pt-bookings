import { ensureDb } from "@/lib/db/init";
import {
  getClientLastMinutePreferences,
  setClientLastMinutePreferences,
  filterPreferencesToTemplateSlots,
  filterTemplateSlotsForClient,
  type LastMinuteSlotRef,
} from "@/lib/services/last-minute";
import { getClientByToken } from "@/lib/services/clients";
import { getEnabledClientLocationIds, getClientLocationOptions } from "@/lib/services/locations";
import { getTrainerSettings } from "@/lib/services/settings";
import { getTrainerTemplateOverlay } from "@/lib/services/templates";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

function checkOptInRateLimit(request: Request) {
  const ip = getRequestIp(request);
  return enforceRateLimit(ip, {
    scope: "opt-in:ip",
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
}

export async function GET(request: Request) {
  await ensureDb();

  const limited = checkOptInRateLimit(request);
  if (limited) return limited;

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  const client = await getClientByToken(token);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  const settings = await getTrainerSettings(client.trainerId);
  const enabledLocationIds = await getEnabledClientLocationIds(client.id);
  const templateSlots = filterTemplateSlotsForClient(
    (await getTrainerTemplateOverlay(client.trainerId)).map(
      ({ dayOfWeek, startTime, endTime, locationId, locationName }) => ({
        dayOfWeek,
        startTime,
        endTime,
        locationId,
        locationName,
      }),
    ),
    enabledLocationIds,
  );
  const preferences = filterPreferencesToTemplateSlots(
    await getClientLastMinutePreferences(client.id),
    templateSlots,
  );

  const enabledLocations = (await getClientLocationOptions(
    client.trainerId,
    client.id,
  ))
    .filter((loc) => loc.enabled)
    .map(({ id, name }) => ({ id, name }));

  return Response.json({
    optIn: client.lastMinuteOptIn,
    preferences,
    scheduleStartTime: settings.scheduleStartTime,
    scheduleEndTime: settings.scheduleEndTime,
    enabledLocations,
    templateSlots: templateSlots.map(
      ({ dayOfWeek, startTime, endTime, locationId, locationName }) => ({
        dayOfWeek,
        startTime,
        endTime,
        locationId,
        locationName,
      }),
    ),
  });
}

export async function POST(request: Request) {
  await ensureDb();

  const limited = checkOptInRateLimit(request);
  if (limited) return limited;

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

    const updated = filterPreferencesToTemplateSlots(
      await getClientLastMinutePreferences(client.id),
      filterTemplateSlotsForClient(
        (await getTrainerTemplateOverlay(client.trainerId)).map(
          ({ dayOfWeek, startTime, endTime, locationId, locationName }) => ({
            dayOfWeek,
            startTime,
            endTime,
            locationId,
            locationName,
          }),
        ),
        await getEnabledClientLocationIds(client.id),
      ),
    );
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
