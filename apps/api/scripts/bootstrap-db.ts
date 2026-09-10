import { assertSchemaReady } from "../src/database/schema-readiness.js";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const ssl =
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  connectionString,
  max: 1,
  ssl,
});

async function run() {
  const schemaPath = resolve(process.cwd(), "../../database/schema.sql");
  const seedPath = resolve(process.cwd(), "../../database/seed.sql");

  const schema = await readFile(schemaPath, "utf8");
  const seed = await readFile(seedPath, "utf8");

  const client = await pool.connect();

  try {
    console.log("Connecting to PostgreSQL...");
    await client.query("SELECT 1");

    console.log("Applying database/schema.sql...");
    await client.query(schema);
    await assertSchemaReady(client);

    console.log("Applying database/seed.sql...");
    await client.query(seed);

    const result = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM deals",
    );

    console.log(
      `FlipScout database is ready. Deals available: ${result.rows[0]?.count ?? "0"}`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(async (error) => {
  console.error("FlipScout database bootstrap failed.");
  console.error(error instanceof Error ? error.message : error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
