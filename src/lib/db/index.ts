import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import * as relations from "./relations";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env.local and set your Postgres connection string.",
    );
  }
  return url;
}

function poolSsl(connectionString: string) {
  if (
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1")
  ) {
    return undefined;
  }
  return { rejectUnauthorized: false } as const;
}

let pool: Pool | null = null;
let dbInstance: ReturnType<
  typeof drizzle<typeof schema & typeof relations>
> | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl: poolSsl(connectionString),
    });
  }
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema: { ...schema, ...relations } });
  }
  return dbInstance;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export function resetDbConnection() {
  dbInstance = null;
}

export { schema };
