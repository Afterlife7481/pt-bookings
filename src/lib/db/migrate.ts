import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "./index";

export async function runMigrations() {
  const db = getDb();
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closeDb();
      console.log("Migrations applied.");
    })
    .catch(async (err) => {
      console.error(err);
      await closeDb();
      process.exit(1);
    });
}
