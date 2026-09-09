import "dotenv/config";
import { Pool } from "pg";
import { seedDemoInventory } from "../src/ingestion/seed-demo.js";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1,
  connectionTimeoutMillis: 15000, statement_timeout: 30000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
try { console.log(JSON.stringify(await seedDemoInventory(pool), null, 2)); }
catch (error) { console.error(error instanceof Error ? error.message : "Demo seed failed."); process.exitCode = 1; }
finally { await pool.end(); }
