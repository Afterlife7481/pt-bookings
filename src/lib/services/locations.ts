import { nanoid } from "nanoid";
import { eq, and, inArray, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { locations, clientLocations, clients } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";

export type ClientLocationOption = {
  id: string;
  name: string;
  enabled: boolean;
};

export async function listLocations(trainerId: string) {
  const db = getDb();
  return db
    .select()
    .from(locations)
    .where(eq(locations.trainerId, trainerId))
    .orderBy(asc(locations.name));
}

export async function createLocation(trainerId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Location name is required");

  const db = getDb();
  const id = nanoid();
  const createdAt = nowIso();

  await db.insert(locations).values({
    id,
    trainerId,
    name: trimmed,
    createdAt,
  });

  return { id, trainerId, name: trimmed, createdAt };
}

export async function updateLocation(
  trainerId: string,
  locationId: string,
  name: string,
) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Location name is required");

  const db = getDb();
  const location = await assertTrainerLocation(trainerId, locationId);

  await db
    .update(locations)
    .set({ name: trimmed })
    .where(eq(locations.id, locationId));

  return { ...location, name: trimmed };
}

export async function assertTrainerLocation(
  trainerId: string,
  locationId: string,
) {
  const db = getDb();
  const location = await db.query.locations.findFirst({
    where: and(
      eq(locations.id, locationId),
      eq(locations.trainerId, trainerId),
    ),
  });
  if (!location) throw new Error("Location not found");
  return location;
}

export async function deleteLocation(trainerId: string, locationId: string) {
  const db = getDb();
  const location = await db.query.locations.findFirst({
    where: and(
      eq(locations.id, locationId),
      eq(locations.trainerId, trainerId),
    ),
  });
  if (!location) throw new Error("Location not found");

  await db.delete(locations).where(eq(locations.id, locationId));
}

export async function getClientLocationOptions(
  trainerId: string,
  clientId: string,
): Promise<ClientLocationOption[]> {
  const db = getDb();
  const trainerLocations = await listLocations(trainerId);

  const enabledRows = await db
    .select({ locationId: clientLocations.locationId })
    .from(clientLocations)
    .innerJoin(clients, eq(clientLocations.clientId, clients.id))
    .where(
      and(
        eq(clientLocations.clientId, clientId),
        eq(clients.trainerId, trainerId),
      ),
    );

  const enabledIds = new Set(enabledRows.map((r) => r.locationId));

  return trainerLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    enabled: enabledIds.has(loc.id),
  }));
}

export async function setClientLocations(
  trainerId: string,
  clientId: string,
  locationIds: string[],
) {
  const db = getDb();
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)),
  });
  if (!client) throw new Error("Client not found");

  const uniqueIds = [...new Set(locationIds)];

  if (uniqueIds.length > 0) {
    const owned = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.trainerId, trainerId),
          inArray(locations.id, uniqueIds),
        ),
      );

    if (owned.length !== uniqueIds.length) {
      throw new Error("One or more locations are invalid");
    }
  }

  await db
    .delete(clientLocations)
    .where(eq(clientLocations.clientId, clientId));

  if (uniqueIds.length === 0) return;

  const createdAt = nowIso();
  await db.insert(clientLocations).values(
    uniqueIds.map((locationId) => ({
      id: nanoid(),
      clientId,
      locationId,
      createdAt,
    })),
  );
}
