import "dotenv/config";
import { Pool } from "pg";
import { inspectSchema, migrationAction } from "../src/database/schema-readiness.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1,
  connectionTimeoutMillis: 15000, statement_timeout: 30000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
try {
  const client = await pool.connect();
  try {
    const context = await client.query("SELECT current_database() AS database, current_schema() AS schema");
    const status = await inspectSchema(client);
    const dealCount = status.missingTables.includes("deals") ? null
      : Number((await client.query("SELECT COUNT(*)::text AS count FROM deals")).rows[0].count);
    console.log(JSON.stringify({ ...context.rows[0], ...status, dealCount,
      ...(!status.ok ? { action: migrationAction } : {}) }, null, 2));
    if (!status.ok) process.exitCode = 1;
  } finally { client.release(); }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database check failed.");
  process.exitCode = 1;
} finally { await pool.end(); }
