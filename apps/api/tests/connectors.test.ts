import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import { parseConfig, readiness, type HttpSourceConfig } from "../src/ingestion/http-config.js";
import { HttpJsonAdapter } from "../src/ingestion/http-json-adapter.js";
import { validateBatch } from "../src/ingestion/validation.js";
import { runSource } from "../src/ingestion/run-source.js";
import { ingestRetailerBatch } from "../src/ingestion/postgres-ingestion.js";
import type { Pool } from "pg";
const store = { externalStoreId: "001", retailer: "Fixture", storeName: "Test", city: "City", state: "ST", latitude: "40", longitude: "-74" };
const deal = { externalDealId: "0012", externalStoreId: "001", productName: "Fixture product", brand: "Fixture", category: "Test", retailPrice: "100", clearancePrice: "25", inventory: "2", sourceUpdatedAt: "2026-09-08T12:00:00Z" };
function config(): HttpSourceConfig {
  const c = JSON.parse(readFileSync(new URL("../config/retailer-sources.example.json", import.meta.url), "utf8"))[0];
  c.enabled = true; delete c.auth; return parseConfig(c);
}
function json(v: unknown, status = 200, headers = {}) { return new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json", ...headers } }); }
function adapter(c = config(), replies = [json({ items: [store], nextCursor: null }), json({ items: [deal], nextCursor: null })]) {
  return new HttpJsonAdapter(c, (async () => { assert.ok(replies.length); return replies.shift()!; }) as typeof fetch, async () => {});
}
test("normalizes values while preserving string identifiers", async () => {
  const c = config(); c.deals.mapping.clearancePrice.scale = 0.01;
  const a = adapter(c); const b = await a.fetchBatch();
  assert.equal(b.deals[0].externalDealId, "0012"); assert.equal(b.deals[0].clearancePrice, 0.25);
  assert.equal(b.stores[0].latitude, 40); assert.equal(b.fullSnapshot, false); assert.equal(a.diagnostics.pages, 2);
});
test("rejects unsafe and invalid configuration", () => {
  for (const mutate of [(c: any) => c.source = "mock", (c: any) => c.timeoutMs = 0, (c: any) => c.retries = 99, (c: any) => c.stores.url = "http://external.test", (c: any) => c.deals.mapping.source = { value: "other", type: "string" }, (c: any) => delete c.stores.mapping.latitude]) {
    const c = config(); mutate(c); assert.throws(() => parseConfig(c), /INVALID_SOURCE_CONFIG/);
  }
});
test("disabled and missing credential readiness", async () => {
  const c = config(); c.enabled = false; assert.equal(readiness(c), "disabled");
  await assert.rejects(adapter(c).fetchBatch(), /SOURCE_NOT_READY/);
  c.enabled = true; c.auth = { header: "Authorization", env: "UNSET_FIXTURE_CREDENTIAL" };
  assert.equal(readiness(c, {}), "missing-credential");
});
test("cursor pagination follows opaque tokens", async () => {
  const c = config(); const urls: URL[] = [];
  const replies = [json({ items: [store], nextCursor: null }), json({ items: [deal], nextCursor: "a&b" }), json({ items: [{ ...deal, externalDealId: "two" }], nextCursor: null })];
  const a = new HttpJsonAdapter(c, (async u => { urls.push(new URL(String(u))); return replies.shift()!; }) as typeof fetch);
  assert.equal((await a.fetchBatch()).deals.length, 2); assert.equal(urls[2].searchParams.get("cursor"), "a&b");
});
test("page pagination requires terminal short page", async () => {
  const c = config(); c.fullSnapshot = true;
  c.deals.pagination = { mode: "page", param: "page", sizeParam: "limit", pageSize: 1, start: 0 };
  const b = await adapter(c, [json({ items: [store], nextCursor: null }), json({ items: [deal] }), json({ items: [] })]).fetchBatch();
  assert.equal(b.fullSnapshot, true);
});
test("page and record limits reject incomplete imports", async () => {
  const c = config(); c.maxPages = 1;
  await assert.rejects(adapter(c, [json({ items: [store], nextCursor: "more" })]).fetchBatch(), /PAGE_LIMIT/);
  c.maxRecords = 1; await assert.rejects(adapter(c).fetchBatch(), /RECORD_LIMIT/);
});
test("missing cursor and repeated cursor fail closed", async () => {
  await assert.rejects(adapter(config(), [json({ items: [store] })]).fetchBatch(), /INVALID_CURSOR/);
  await assert.rejects(adapter(config(), [json({ items: [], nextCursor: "same" }), json({ items: [], nextCursor: "same" })]).fetchBatch(), /CURSOR_LOOP/);
});
test("retries 429 with bounded Retry-After", async () => {
  const a = adapter(config(), [json({}, 429, { "retry-after": "0" }), json({ items: [store], nextCursor: null }), json({ items: [deal], nextCursor: null })]);
  await a.fetchBatch(); assert.equal(a.diagnostics.retries, 1);
  await assert.rejects(adapter(config(), [json({}, 429, { "retry-after": "300" })]).fetchBatch(), /RETRY_AFTER_TOO_LONG/);
});
test("does not retry auth or malformed response failures or expose response body", async () => {
  const a = adapter(config(), [json({ secret: "do-not-log" }, 401)]);
  await assert.rejects(a.fetchBatch(), /^Error: HTTP_401$/); assert.equal(a.diagnostics.requests, 1);
  await assert.rejects(adapter(config(), [new Response("oops", { headers: { "content-type": "application/json" } })]).fetchBatch(), /INVALID_JSON/);
  await assert.rejects(adapter(config(), [new Response("html")]).fetchBatch(), /INVALID_CONTENT_TYPE/);
  const c = config(); c.maxResponseBytes = 1; await assert.rejects(adapter(c).fetchBatch(), /RESPONSE_TOO_LARGE/);
});
test("bounded retry exhaustion", async () => {
  const c = config(); c.retries = 2; const a = adapter(c, [json({}, 503), json({}, 503), json({}, 503)]);
  await assert.rejects(a.fetchBatch(), /HTTP_RETRYABLE/); assert.equal(a.diagnostics.requests, 3);
});
test("invalid mappings, duplicate keys and missing store references block batch", async () => {
  for (const changed of [{ ...deal, inventory: "no" }, { ...deal, inventory: -1 }, { ...deal, externalStoreId: "absent" }, { ...deal, sourceUpdatedAt: "yesterday" }]) {
    await assert.rejects(adapter(config(), [json({ items: [store], nextCursor: null }), json({ items: [changed], nextCursor: null })]).fetchBatch());
  }
  await assert.rejects(adapter(config(), [json({ items: [store], nextCursor: null }), json({ items: [deal, deal], nextCursor: null })]).fetchBatch(), /INVALID_BATCH/);
});
test("empty full snapshot requires separate opt-in", async () => {
  const c = config(); c.fullSnapshot = true;
  const replies = () => [json({ items: [], nextCursor: null }), json({ items: [], nextCursor: null })];
  await assert.rejects(adapter(c, replies()).fetchBatch(), /EMPTY_SNAPSHOT_BLOCKED/);
  c.allowEmptySnapshot = true; assert.equal((await adapter(c, replies()).fetchBatch()).fullSnapshot, true);
});
test("source mismatch rejected", async () => {
  const b = await adapter().fetchBatch(); b.deals[0].source = "other";
  assert.throws(() => validateBatch(b), /INVALID_BATCH/);
});
test("real HTTP: pages, timeout, redirect rejection", async () => {
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/slow")) return;
    if (req.url?.startsWith("/redirect")) { res.writeHead(302, { location: "/stores" }); res.end(); return; }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ items: req.url?.startsWith("/stores") ? [store] : [deal], nextCursor: null }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const c = config(); c.stores.url = base + "/stores"; c.deals.url = base + "/deals"; c.retries = 0;
    assert.equal((await new HttpJsonAdapter(c).fetchBatch()).deals.length, 1);
    c.stores.url = base + "/redirect"; await assert.rejects(new HttpJsonAdapter(c).fetchBatch(), /HTTP_NETWORK/);
    c.stores.url = base + "/slow"; c.timeoutMs = 20; await assert.rejects(new HttpJsonAdapter(c).fetchBatch(), /HTTP_TIMEOUT/);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});
function fakePool(options: { busy?: boolean; due?: boolean; failWrite?: boolean } = {}) {
  const queries: { sql: string; values?: unknown[] }[] = []; let released = 0;
  const query = async (sql: string, values?: unknown[]) => {
    queries.push({ sql, values });
    if (options.failWrite && sql.includes("INSERT INTO deals")) throw new Error("private-db-error");
    return { rows: [{ acquired: !options.busy, due: options.due ?? true, id: "store-uuid" }] };
  };
  return { pool: { connect: async () => ({ query, release: () => released++ }), query } as unknown as Pool, queries, releases: () => released };
}
test("scheduler skips busy and not-due sources without fetching", async () => {
  for (const options of [{ busy: true }, { due: false }]) {
    const f = fakePool(options); const a = adapter();
    const result = await runSource(f.pool, a, 60);
    assert.equal(result.status, options.busy ? "busy" : "not-due"); assert.equal(a.diagnostics.requests, 0); assert.equal(f.releases(), 1);
  }
});
test("fetch failures are audited and locks released", async () => {
  const f = fakePool(); const a = adapter(config(), [json({}, 401)]);
  await assert.rejects(runSource(f.pool, a), /HTTP_401/);
  assert.ok(f.queries.some(q => q.sql.includes("INSERT INTO ingestion_runs") && q.values?.includes("HTTP_401")));
  assert.ok(f.queries.some(q => q.sql.includes("pg_advisory_unlock"))); assert.equal(f.releases(), 1);
});
test("persistence rolls back SQL failures and does not perform snapshot cleanup", async () => {
  const f = fakePool({ failWrite: true }); const b = await adapter().fetchBatch(); b.fullSnapshot = true;
  await assert.rejects(ingestRetailerBatch(f.pool, b));
  assert.ok(f.queries.some(q => q.sql === "ROLLBACK"));
  assert.ok(!f.queries.some(q => q.sql.includes("UPDATE deals")));
  assert.ok(!f.queries.some(q => q.sql === "COMMIT"));
});
test("complete snapshot cleanup uses exact seen keys and partial batches never deactivate", async () => {
  for (const fullSnapshot of [false, true]) {
    const f = fakePool(); const b = await adapter().fetchBatch(); b.fullSnapshot = fullSnapshot;
    await ingestRetailerBatch(f.pool, b);
    const clean = f.queries.find(q => q.sql.includes("UPDATE deals"));
    assert.equal(!!clean, fullSnapshot);
    if (clean) assert.deepEqual(JSON.parse(clean.values![1] as string), [{ store_id: "store-uuid", external_id: "0012" }]);
  }
});
