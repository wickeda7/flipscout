import { PostgresStoreProvider } from "../src/stores/postgres-store-provider.js";
import { parseStoreQuery } from "../src/stores/query.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { runSource } from "../src/ingestion/run-source.js";
import { ConnectorError } from "../src/ingestion/http-config.js";
import type { RetailerIngestionBatch } from "@flipscout/types";

test("PostgreSQL: idempotency, cleanup, rollback, audit, locking and due interval", async () => {
  assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable PostgreSQL database");
  const schema = "connector_test_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 4, options: `-c search_path=${schema}` });
    await pool.query(readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8"));
    const source = schema;
    const batch: RetailerIngestionBatch = { source, fetchedAt: new Date().toISOString(), fullSnapshot: false,
      stores: [{ source, externalStoreId: "store", retailer: "Fixture", storeName: "Store", city: "City", state: "ST", latitude: 40, longitude: -74 }],
      deals: ["one", "two"].map(externalDealId => ({ source, externalDealId, externalStoreId: "store", productName: "Fixture", brand: "Fixture", category: "Test", retailPrice: 100, clearancePrice: 25, inventory: 1, sourceUpdatedAt: new Date().toISOString() })) };
    const adapter = { source, fetchBatch: async () => structuredClone(batch) };
    await runSource(pool, adapter); await runSource(pool, adapter);
    const directory = new PostgresStoreProvider(pool);
    await pool.query("ALTER TABLE stores DROP COLUMN is_active");
    await assert.rejects(directory.search(parseStoreQuery(new URLSearchParams())), { code: "42703" });
    const upgradeSchema = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");
    await pool.query(upgradeSchema);
    await pool.query(upgradeSchema);

    const nearby = await directory.search(parseStoreQuery(new URLSearchParams("lat=40&lng=-74&radiusMiles=0.1")));
    assert.equal(nearby.total, 1);
    assert.equal(nearby.stores[0].activeDealCount, 2);
    assert.equal(nearby.stores[0].distanceMiles, 0);
    const emptyPage = await directory.search(parseStoreQuery(new URLSearchParams("offset=10000")));
    assert.equal(emptyPage.total, 1);
    assert.deepEqual(emptyPage.stores, []);

    assert.equal((await pool.query("SELECT count(*)::int AS n FROM deals")).rows[0].n, 2);
    batch.deals.pop(); await runSource(pool, adapter);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM deals WHERE is_active")).rows[0].n, 2);
    batch.fullSnapshot = true; await runSource(pool, adapter);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM deals WHERE is_active")).rows[0].n, 1);
    await assert.rejects(runSource(pool, { source, fetchBatch: async () => { throw new ConnectorError("HTTP_401"); } }));
    assert.equal((await pool.query("SELECT error_message FROM ingestion_runs ORDER BY started_at DESC LIMIT 1")).rows[0].error_message, "HTTP_401");
    assert.equal((await runSource(pool, adapter, 60)).status, "not-due");
    const lock = await pool.connect();
    try {
      await lock.query("SELECT pg_advisory_lock(73621, hashtext($1))", [source]);
      assert.equal((await runSource(pool, adapter)).status, "busy");
    } finally { await lock.query("SELECT pg_advisory_unlock(73621, hashtext($1))", [source]); lock.release(); }
    await pool.query("CREATE FUNCTION reject_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$");
    await pool.query("CREATE TRIGGER reject_fixture BEFORE INSERT OR UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION reject_fixture()");
    batch.stores[0].storeName = "Must roll back";
    await assert.rejects(runSource(pool, adapter));
    assert.equal((await pool.query("SELECT store_name FROM stores")).rows[0].store_name, "Store");
    assert.equal((await pool.query("SELECT error_message FROM ingestion_runs ORDER BY started_at DESC LIMIT 1")).rows[0].error_message, "PERSISTENCE_FAILED");
  } finally {
    await pool?.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});

test("legacy store schema upgrades before demo seeding", async () => {
  assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable PostgreSQL database");
  const { seedDemoInventory } = await import("../src/ingestion/seed-demo.js");
  const schema = "demo_upgrade_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2, options: `-c search_path=${schema}` });
    const sql = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");
    await pool.query(sql);
    await pool.query("ALTER TABLE stores DROP COLUMN last_seen_at");
    await assert.rejects(seedDemoInventory(pool), { code: "42703" });
    await pool.query(sql);
    await pool.query(sql);
    assert.deepEqual(await seedDemoInventory(pool), { source: "mock", stores: 6, deals: 48 });
    await seedDemoInventory(pool);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM stores")).rows[0].n, 6);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM deals WHERE is_active")).rows[0].n, 48);
  } finally {
    await pool?.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
