import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { RetailerAdapter } from "./retailer-adapter.js";
import { ingestRetailerBatch } from "./postgres-ingestion.js";
import { ConnectorError } from "./http-config.js";

// Use a direct PostgreSQL connection or session pooling (not transaction pooling).
// A separate connection remains locked throughout fetch + transactional persistence.
export async function runSource(pool: Pool, adapter: RetailerAdapter, intervalMinutes?: number) {
  const lock = await pool.connect();
  let acquired = false;
  try {
    const result = await lock.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock(73621, hashtext($1)) AS acquired", [adapter.source]);
    acquired = result.rows[0].acquired;
    if (!acquired) return { source: adapter.source, status: "busy" };
    if (intervalMinutes !== undefined) {
      const due = await lock.query<{ due: boolean }>(
        "SELECT NOT EXISTS (SELECT 1 FROM ingestion_runs WHERE source = $1 AND completed_at > NOW() - ($2 * INTERVAL '1 minute')) AS due",
        [adapter.source, intervalMinutes]);
      if (!due.rows[0].due) return { source: adapter.source, status: "not-due" };
    }
    const started = new Date().toISOString();
    let batch;
    try { batch = await adapter.fetchBatch(); }
    catch (e) {
      await lock.query(
        "INSERT INTO ingestion_runs (id,source,status,started_at,completed_at,error_message) VALUES ($1,$2,'failed',$3,NOW(),$4)",
        [randomUUID(), adapter.source, started, e instanceof ConnectorError ? e.code : "FETCH_FAILED"]);
      throw e;
    }
    return { status: "completed", ...await ingestRetailerBatch(pool, batch) };
  } finally {
    try { if (acquired) await lock.query("SELECT pg_advisory_unlock(73621, hashtext($1))", [adapter.source]); }
    catch { lock.release(true); acquired = false; throw new ConnectorError("LOCK_RELEASE_FAILED"); }
    lock.release();
  }
}
