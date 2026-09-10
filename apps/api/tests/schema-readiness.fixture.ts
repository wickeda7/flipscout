import assert from "node:assert/strict";
import type { Pool } from "pg";
import { inspectSchema, assertSchemaReady, isMissingSchemaError } from "../src/database/schema-readiness.js";
import { PostgresDealProvider } from "../src/providers/postgres-deal-provider.js";

// Run only in an isolated test schema; deliberately removes metadata columns.
export async function verifySchemaReadiness(db: Pick<Pool, "query">, applySchema: () => Promise<unknown>) {
  await applySchema();
  assert.deepEqual(await inspectSchema(db), { ok: true, missingTables: [], missingColumns: [] });
  await db.query("ALTER TABLE stores DROP COLUMN last_seen_at");
  await db.query("ALTER TABLE stores DROP COLUMN source_url");
  await db.query("ALTER TABLE deals DROP COLUMN source_updated_at");
  assert.deepEqual((await inspectSchema(db)).missingColumns,
    ["deals.source_updated_at", "stores.last_seen_at", "stores.source_url"]);
  await assert.rejects(assertSchemaReady(db), /Run yarn db:migrate/);
  const provider = new PostgresDealProvider(db as Pool);
  assert.deepEqual(await provider.health(), { ok: false, detail: "DATABASE_SCHEMA_OUTDATED" });
  await applySchema();
  await applySchema();
  await assertSchemaReady(db);
  assert.deepEqual(await provider.health(), { ok: true, detail: "postgres" });
  await db.query("ALTER TABLE ingestion_runs RENAME TO saved_ingestion_runs");
  assert.deepEqual((await inspectSchema(db)).missingTables, ["ingestion_runs"]);
  await db.query("ALTER TABLE saved_ingestion_runs RENAME TO ingestion_runs");
  assert.equal(isMissingSchemaError({ code: "42703" }), true);
  assert.equal(isMissingSchemaError({ code: "42P01" }), true);
  assert.equal(isMissingSchemaError({ code: "ECONNREFUSED" }), false);
  assert.equal(isMissingSchemaError(null), false);
  await assertSchemaReady(db);
}
