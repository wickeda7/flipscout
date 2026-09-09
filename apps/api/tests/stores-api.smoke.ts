import assert from "node:assert/strict";
import { FlipScoutApiClient } from "../../../packages/api-client/src/index.js";
const baseUrl = process.env.TEST_API_URL ?? "http://localhost:4000";
const client = new FlipScoutApiClient({ baseUrl });
const first = await client.searchStores({ limit: 1 });
assert.ok(first.total > 0, "Run against the mock API or a populated test catalog");
assert.equal(first.stores.length, 1); assert.equal(first.stores[0].distanceMiles, null);
const next = await client.searchStores({ limit: 1, offset: 1 });
if (first.total > 1) assert.notEqual(first.stores[0].id, next.stores[0].id);
const s = first.stores[0];
const near = await client.searchStores({ latitude: s.latitude, longitude: s.longitude, radiusMiles: 0.1 });
assert.ok(near.stores.some(x => x.id === s.id));
for (const suffix of ["lat=91&lng=0", "lat=0", "radiusMiles=25", "limit=101", "offset=-1", "sort=bad", "lat=&lng=0"]) {
  const response = await fetch(`${baseUrl}/v1/stores?${suffix}`);
  assert.equal(response.status, 400); assert.equal((await response.json()).code, "INVALID_STORE_QUERY");
  assert.equal(response.headers.get("cache-control"), "no-store");
}
const controller = new AbortController(); controller.abort();
await assert.rejects(client.searchStores({}, controller.signal), { name: "AbortError" });
console.log("Store API smoke checks passed: shared client, pagination, radius, validation, cache policy, cancellation.");
