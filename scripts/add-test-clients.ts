import { eq } from "drizzle-orm";
import { runMigrations } from "../src/lib/db/migrate";
import { getDb } from "../src/lib/db";
import { clients } from "../src/lib/db/schema";
import { DEFAULT_TRAINER_ID } from "../src/lib/constants";
import { createClient } from "../src/lib/services/clients";

const testClients = [
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

async function main() {
  await runMigrations();
  const db = getDb();
  const created: { name: string; token: string; phone: string; lastMinuteOptIn: boolean }[] = [];

  for (const c of testClients) {
    const id = await createClient({
      trainerId: DEFAULT_TRAINER_ID,
      name: c.name,
      phone: c.phone,
      lastMinuteOptIn: c.lastMinuteOptIn,
    });
    const row = await db.query.clients.findFirst({ where: eq(clients.id, id) });
    if (row) {
      created.push({
        name: row.name,
        token: row.token,
        phone: row.phone,
        lastMinuteOptIn: row.lastMinuteOptIn,
      });
    }
  }

  console.log(`Created ${created.length} clients for Alex Trainer (${DEFAULT_TRAINER_ID}):\n`);
  for (const c of created) {
    console.log(`- ${c.name} | ${c.phone} | last-minute: ${c.lastMinuteOptIn ? "yes" : "no"}`);
    console.log(`  http://localhost:3000/c/${c.token}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
