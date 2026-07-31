import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "./index";

function explainDbTlsError(err: unknown): unknown {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message : String(err);
  if (
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    /self-signed certificate/i.test(message)
  ) {
    return new Error(
      "Postgres TLS failed (self-signed certificate in chain). " +
        "Set DATABASE_SSL_INSECURE=1 on this environment if your provider " +
        "uses a CA that Node does not trust (common on Railway). " +
        "Prefer installing the provider CA when possible.",
      { cause: err },
    );
  }
  return err;
}

export async function runMigrations() {
  const db = getDb();
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } catch (err) {
    throw explainDbTlsError(err);
  }
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
