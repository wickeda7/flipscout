import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceMiles } from "@flipscout/core";
import { parseOrigin, parseStoreQuery } from "../src/stores/query.js";
import { MockStoreProvider } from "../src/stores/mock-store-provider.js";
import { mockDeals } from "../src/mock-deals.js";
import { currentLocation, parseManualLocation } from "../../web/src/lib/location.js";
import { PostgresStoreProvider } from "../src/stores/postgres-store-provider.js";
import type { Pool } from "pg";
const query = (s = "") => parseStoreQuery(new URLSearchParams(s));

test("store search defaults and zero coordinates", () => {
  assert.deepEqual(query(), { latitude: undefined, longitude: undefined, radiusMiles: undefined, sort: "name", limit: 12, offset: 0, q: undefined, retailer: undefined, source: undefined });
  assert.equal(query("lat=0&lng=0").sort, "distance");
  assert.deepEqual(parseOrigin(new URLSearchParams("lat=0&lng=0")), { latitude: 0, longitude: 0 });
});
test("rejects malformed, unpaired, out-of-range and duplicate coordinates", () => {
  for (const s of ["lat=0", "lng=0", "lat=&lng=0", "lat=91&lng=0", "lat=0&lng=-181", "lat=NaN&lng=0", "lat=Infinity&lng=0", "lat=1&lat=2&lng=0", "lat=0x10&lng=0", "lat=%20&lng=0"]) assert.throws(() => query(s), { code: "INVALID_STORE_QUERY" }, s);
});
test("rejects unsafe pagination, radius, sort and overlong search", () => {
  for (const s of ["radiusMiles=25", "sort=distance", "sort=profit", "limit=0", "limit=101", "limit=1.5", "offset=-1", "offset=10001", "offset=1.5", "lat=0&lng=0&radiusMiles=501", "lat=0&lng=0&radiusMiles=0", "q=" + "x".repeat(121), "unknown=1", "q=a&q=b"]) assert.throws(() => query(s), { code: "INVALID_STORE_QUERY" }, s);
});
test("great-circle distances cover zero, symmetry, known distance, antipodes, dateline and poles", () => {
  const a = { latitude: 0, longitude: 0 }, b = { latitude: 0, longitude: 1 };
  assert.equal(distanceMiles(a, a), 0);
  assert.ok(Math.abs(distanceMiles(a, b) - 69.0934) < 0.01);
  assert.equal(distanceMiles(a, b), distanceMiles(b, a));
  assert.ok(Number.isFinite(distanceMiles(a, { latitude: 0, longitude: 180 })));
  assert.ok(distanceMiles({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 }) < 14);
  assert.ok(distanceMiles({ latitude: 90, longitude: 0 }, { latitude: 90, longitude: 180 }) < 0.001);
});
test("catalog without origin returns unknown distance, not zero", async () => {
  const result = await new MockStoreProvider().search(query());
  assert.ok(result.total > 0); assert.ok(result.stores.every(s => s.distanceMiles === null));
  assert.equal(result.dataProvider, "mock");
});
test("name and city search, retailer and source filters", async () => {
  const provider = new MockStoreProvider();
  const result = await provider.search(query("q=lake%20mary&retailer=home%20depot&source=mock"));
  assert.ok(result.total > 0); assert.ok(result.stores.every(s => s.retailer === "Home Depot" && s.city === "Lake Mary"));
  assert.equal((await provider.search(query("source=other"))).total, 0);
  assert.equal((await provider.search(query("q=%25"))).total, 0);
});
test("radius boundary and distance sorting use supplied origin", async () => {
  const provider = new MockStoreProvider(); const a = mockDeals[0];
  const p = `lat=${a.latitude}&lng=${a.longitude}`;
  const near = await provider.search(query(p + "&radiusMiles=0.1"));
  assert.ok(near.stores.some(s => s.storeName === a.storeName));
  assert.ok(near.stores.every(s => s.distanceMiles! <= 0.1));
  const all = await provider.search(query(p));
  assert.ok(all.stores.every((s, i) => i === 0 || s.distanceMiles! >= all.stores[i - 1].distanceMiles!));
});
test("pagination is stable, unique, and handles empty pages", async () => {
  const provider = new MockStoreProvider();
  const first = await provider.search(query("limit=1"));
  const second = await provider.search(query("limit=1&offset=1"));
  assert.equal(first.total, second.total); assert.notEqual(first.stores[0].id, second.stores[0].id);
  const last = await provider.search(query("offset=10000"));
  assert.equal(last.stores.length, 0); assert.equal(last.hasMore, false); assert.equal(last.total, first.total);
});
test("stores remain visible when all their deals are stale, inactive or out of stock", async () => {
  const fixtures = [
    { ...mockDeals[0], updatedMinutesAgo: 999999 },
    { ...mockDeals[1], inventory: 0 },
    { ...mockDeals[2], isActive: false },
  ];
  const result = await new MockStoreProvider(fixtures).search(query());
  assert.ok(result.total > 0);
  assert.ok(result.stores.every(s => s.activeDealCount === 0 && s.unitCount === 0 && s.totalPotentialProfit === 0));
});
test("manual coordinates accept zero and reject blanks/nonfinite/out-of-range", () => {
  assert.deepEqual(parseManualLocation("0", "0"), { latitude: 0, longitude: 0 });
  for (const [a, b] of [["", "0"], ["0", " "], ["91", "0"], ["0", "181"], ["NaN", "0"]]) assert.throws(() => parseManualLocation(a, b));
});
test("geolocation handles unsupported, denied, unavailable and timeout", async () => {
  await assert.rejects(currentLocation(undefined), { code: "unsupported" });
  for (const [code, expected] of [[1, "denied"], [2, "unavailable"], [3, "timeout"]] as const) {
    await assert.rejects(currentLocation({ getCurrentPosition: (_success, failure) => failure!({ code } as GeolocationPositionError) }), { code: expected });
  }
});
test("geolocation success uses one-shot bounded options", async () => {
  const result = await currentLocation({ getCurrentPosition: (success, _failure, options) => {
    assert.equal(options?.timeout, 10000); assert.equal(options?.maximumAge, 60000);
    success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition);
  } });
  assert.deepEqual(result, { latitude: 0, longitude: 0 });
});
test("PostgreSQL search uses bound values, escaped patterns and whitelisted ordering", async () => {
  let sql = ""; let values: unknown[] = [];
  const pool = { query: async (s: string, v: unknown[]) => { sql = s; values = v; return { rows: [{ total: 2, stores: [] }] }; } } as unknown as Pool;
  const result = await new PostgresStoreProvider(pool).search(query("q=50%25_&lat=0&lng=0&limit=1"));
  assert.equal(values[2], "%50\\%\\_%"); assert.equal(values[0], 0); assert.equal(values[1], 0);
  assert.ok(!sql.includes("50%")); assert.ok(sql.includes("LEFT JOIN LATERAL"));
  assert.equal(result.total, 2); assert.equal(result.hasMore, true);
});

test("store inventory isolates stores, paginates and excludes unavailable deals", async () => {
  const { MockDealProvider } = await import("../src/providers/mock-deal-provider.js");
  const { storeInventory } = await import("../src/stores/inventory.js");
  const rows = Array.from({ length: 9 }, (_, n) => ({ ...mockDeals[0], id: `fixture-${n}`, buyScore: 90 - n }));
  rows[6].inventory = 0;
  rows[7].updatedMinutesAgo = 999999;
  rows[8].isActive = false;
  const other = { ...mockDeals[1], id: "other-store", storeName: "Different store" };
  const stores = new MockStoreProvider([...rows, other]);
  const deals = new MockDealProvider([...rows, other]);
  const catalog = await stores.search(query());
  const s = catalog.stores.find(s => s.storeName === rows[0].storeName)!;
  const first = await storeInventory(s.id, new URLSearchParams("limit=3"), stores, deals);
  const second = await storeInventory(s.id, new URLSearchParams("limit=3&offset=3"), stores, deals);
  assert.equal(first.store.activeDealCount, 6); assert.equal(first.deals.length, 3); assert.equal(first.hasMore, true);
  assert.equal(second.deals.length, 3); assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.deals, ...second.deals].map(d => d.id)).size, 6);
  assert.ok(first.deals.every(d => d.storeName === rows[0].storeName));
  assert.equal(first.store.distanceMiles, null);
});

test("store inventory handles unknown stores, invalid queries and location", async () => {
  const { MockDealProvider } = await import("../src/providers/mock-deal-provider.js");
  const { storeInventory } = await import("../src/stores/inventory.js");
  const stores = new MockStoreProvider(), deals = new MockDealProvider();
  await assert.rejects(storeInventory("unknown", new URLSearchParams(), stores, deals), { status: 404 });
  await assert.rejects(storeInventory("", new URLSearchParams(), stores, deals), { status: 400 });
  const s = (await stores.search(query())).stores[0];
  for (const params of ["limit=0", "offset=-1", "lat=0", "retailer=ignored", "sort=distance"])
    await assert.rejects(storeInventory(s.id, new URLSearchParams(params), stores, deals), { status: 400 });
  const result = await storeInventory(s.id, new URLSearchParams(`lat=${s.latitude}&lng=${s.longitude}`), stores, deals);
  assert.equal(result.store.distanceMiles, 0); assert.ok(result.deals.every(d => d.distanceMiles === 0));
  const empty = await storeInventory(s.id, new URLSearchParams("offset=10000"), stores, deals);
  assert.deepEqual(empty.deals, []); assert.equal(empty.hasMore, false);
});

test("inventory product search is literal, case-insensitive and category-scoped", async () => {
  const { MockDealProvider } = await import("../src/providers/mock-deal-provider.js");
  const { storeInventory } = await import("../src/stores/inventory.js");
  const rows = [
    { ...mockDeals[0], id: "a", productName: "50%_ Kit", brand: "Maker", category: "Tools" },
    { ...mockDeals[0], id: "b", productName: "Other kit", brand: "Maker", category: "Garden" },
  ];
  const stores = new MockStoreProvider(rows), deals = new MockDealProvider(rows);
  const id = (await stores.search(query())).stores[0].id;
  const get = (params: string) => storeInventory(id, new URLSearchParams(params), stores, deals);
  assert.deepEqual((await get("q=50%25_")).deals.map(d => d.id), ["a"]);
  assert.deepEqual((await get("q=maker&category=tOoLs")).deals.map(d => d.id), ["a"]);
  assert.equal((await get("q=nonexistent")).deals.length, 0);
  for (const params of ["sort=unknown", "sort=profit&sort=buy-score", "category=" + "x".repeat(81), "q=" + "x".repeat(121)])
    await assert.rejects(get(params), { status: 400 });
});

test("inventory sorting is applied before pagination with stable tie breakers", async () => {
  const { MockDealProvider } = await import("../src/providers/mock-deal-provider.js");
  const { storeInventory } = await import("../src/stores/inventory.js");
  const rows = [
    { ...mockDeals[0], id: "a", clearancePrice: 30, estimatedProfit: 10, buyScore: 99 },
    { ...mockDeals[0], id: "b", clearancePrice: 10, estimatedProfit: 30, buyScore: 70 },
    { ...mockDeals[0], id: "c", clearancePrice: 20, estimatedProfit: 20, buyScore: 80 },
    { ...mockDeals[0], id: "d", clearancePrice: 20, estimatedProfit: 20, buyScore: 80 },
  ];
  const stores = new MockStoreProvider(rows), deals = new MockDealProvider(rows);
  const id = (await stores.search(query())).stores[0].id;
  for (const [sort, expected] of [["buy-score", "acdb"], ["profit", "bcda"], ["price-asc", "bcda"], ["price-desc", "acdb"]]) {
    const first = await storeInventory(id, new URLSearchParams(`sort=${sort}&limit=2`), stores, deals);
    const second = await storeInventory(id, new URLSearchParams(`sort=${sort}&limit=2&offset=2`), stores, deals);
    assert.equal([...first.deals, ...second.deals].map(d => d.id).join(""), expected);
    assert.equal(first.hasMore, true); assert.equal(second.hasMore, false);
  }
});
