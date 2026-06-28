import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { getDb, DB_PATH } from "./index";
import { trainers, clients } from "./schema";
import { DEFAULT_TRAINER_ID, nowIso } from "@/lib/constants";
import { createClient } from "@/lib/services/clients";
import { runMigrations } from "./migrate";

const DATA_DIR = path.dirname(DB_PATH);

const SEED_CLIENTS = [
  { name: "Casey Morgan", phone: "+447700901101", lastMinuteOptIn: true },
  { name: "Jordan Lee", phone: "+447700901102", lastMinuteOptIn: false },
  { name: "Riley Chen", phone: "+447700901103", lastMinuteOptIn: true },
  { name: "Avery Brooks", phone: "+447700901104", lastMinuteOptIn: false },
  { name: "Quinn Patel", phone: "+447700901105", lastMinuteOptIn: true },
  { name: "Morgan Blake", phone: "+447700901106", lastMinuteOptIn: false },
  { name: "Skyler Watts", phone: "+447700901107", lastMinuteOptIn: true },
  { name: "Drew Henderson", phone: "+447700901108", lastMinuteOptIn: false },
  { name: "Finley Ross", phone: "+447700901109", lastMinuteOptIn: true },
  { name: "Harper Singh", phone: "+447700901110", lastMinuteOptIn: false },
];

export function wipeDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    return;
  }

  for (const name of fs.readdirSync(DATA_DIR)) {
    if (name.startsWith("pt-bookings.db")) {
      fs.unlinkSync(path.join(DATA_DIR, name));
    }
  }
}

export async function seedFresh() {
  const db = getDb();
  const ts = nowIso();

  await db.insert(trainers).values({
    id: DEFAULT_TRAINER_ID,
    name: "Alex",
    email: "alex@example.com",
    timezone: "Europe/London",
    createdAt: ts,
  });

  const createdClients: {
    name: string;
    phone: string;
    token: string;
    lastMinuteOptIn: boolean;
  }[] = [];

  for (const client of SEED_CLIENTS) {
    const id = await createClient({
      trainerId: DEFAULT_TRAINER_ID,
      name: client.name,
      phone: client.phone,
      lastMinuteOptIn: client.lastMinuteOptIn,
    });
    const row = await db.query.clients.findFirst({ where: eq(clients.id, id) });
    if (row) {
      createdClients.push({
        name: row.name,
        phone: row.phone,
        token: row.token,
        lastMinuteOptIn: row.lastMinuteOptIn,
      });
    }
  }

  return { trainerEmail: "alex@example.com", clients: createdClients };
}

/** @deprecated Use seedFresh after wipeDatabase for a clean slate. */
export async function seed() {
  return seedFresh();
}

async function resetAndSeed() {
  wipeDatabase();
  runMigrations();
  const result = await seedFresh();

  console.log("Database reset complete.\n");
  console.log(`Trainer: Alex (${result.trainerEmail})`);
  console.log("Log in with a magic link sent to that address.\n");
  console.log(`Created ${result.clients.length} clients:\n`);
  for (const client of result.clients) {
    console.log(
      `- ${client.name} | ${client.phone} | last-minute: ${client.lastMinuteOptIn ? "yes" : "no"}`,
    );
    console.log(`  http://localhost:3000/c/${client.token}`);
  }
}

if (require.main === module) {
  resetAndSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
