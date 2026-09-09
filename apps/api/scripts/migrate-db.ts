import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1,
  connectionTimeoutMillis: 15000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
try {
  const schema = await readFile(new URL("../../../database/schema.sql", import.meta.url), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(schema);
    await client.query("COMMIT");
    console.log("Schema migration complete. No seed data was applied.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Schema migration failed.");
  process.exitCode = 1;
} finally { await pool.end(); }
