import "dotenv/config";
import { Pool } from "pg";
import type { RetailerSource } from "@flipscout/types";
import { getRetailerAdapter } from "../src/ingestion/adapter-registry.js";
import { ingestRetailerBatch } from "../src/ingestion/postgres-ingestion.js";

const source = (process.argv[2] ?? "mock") as RetailerSource;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run retailer ingestion.");
}

const pool = new Pool({
  connectionString,
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

try {
  const adapter = getRetailerAdapter(source);
  console.log(`Fetching FlipScout retailer source: ${source}`);

  const batch = await adapter.fetchBatch();

  console.log(
    `Fetched ${batch.stores.length} stores and ${batch.deals.length} deals.`,
  );

  const result = await ingestRetailerBatch(pool, batch);

  console.log("Ingestion complete:");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
