import { test } from "node:test";
import assert from "node:assert/strict";
import { discoveryRetailers, type DiscoveryQuery } from "@flipscout/types";
import { discoverShopping, normalizeShopping, shoppingMerchants, shoppingParams } from "../src/retailers/shopping-discovery.js";
import { discoveryCacheScope } from "../src/retailers/discovery-cache.js";
import { shoppingLocation } from "../src/retailers/shopping-location.js";
const query: DiscoveryQuery = { retailer: "target", category: "all", kind: "all", page: 1, zip: "33511", radiusMiles: 25 };
const product = (): any => ({ product_id: "123456789", title: "Test product", source: "Target", price: "$5.00", extracted_price: 5,
  old_price: "$10.00", extracted_old_price: 10, product_link: "https://www.google.com/search?ibp=oshop&q=test" });
const fixture = (q = query): any => ({ search_metadata: { status: "Success", created_at: "2026-09-10 10:00:00 UTC" },
  search_parameters: { ...shoppingParams(q), location_requested: shoppingParams(q).location }, shopping_results: [product()] });

test("every requested retailer has a discovery route and online merchants normalize independently", () => {
  assert.equal(discoveryRetailers.length, 12);
  for (const r of discoveryRetailers) {
    if (r.id === "home-depot" || r.id === "walmart") continue;
    assert.ok(Object.hasOwn(shoppingMerchants, r.id));
    const q = { ...query, retailer: r.id }, f = fixture(q);
    f.shopping_results[0].source = shoppingMerchants[r.id].names[0];
    const result = normalizeShopping(f, q);
    assert.equal(result.retailer, r.name); assert.equal(result.offerScope, "online");
    assert.equal(result.storeId, null); assert.equal(result.deals[0].quantity, null);
    assert.equal(result.deals[0].pickupStatus, "unknown"); assert.equal(result.hasMore, false);
    assert.equal(result.deals[0].savings, 5);
  }
});
test("merchant identity cannot come from keywords, substring names or another merchant URL", () => {
  const f = fixture();
  f.shopping_results = ["Target Outlet Fake", "eBay - Target", "Walmart", "Target.com.evil"].map(source => ({ ...product(), source }));
  assert.equal(normalizeShopping(f, query).deals.length, 0);
  f.shopping_results = [{ ...product(), product_link: "https://www.google.com.evil/search?ibp=oshop", link: "https://evil.target.com.evil/item/1" }];
  assert.equal(normalizeShopping(f, query).diagnostics?.invalid, 1);
  f.shopping_results[0].link = "https://www.target.com/p/test/-/A-123";
  assert.equal(normalizeShopping(f, query).deals[0].productUrl, f.shopping_results[0].link);
});
test("only supported prices and labels qualify as deals; malformed and foreign currencies are rejected", () => {
  const f = fixture(); const p = f.shopping_results[0];
  p.old_price = "Was $10.00";
  assert.equal(normalizeShopping(f, query).deals[0].savings, 5);
  delete p.old_price; delete p.extracted_old_price;
  p.title = "CLEARANCE penny sale special"; p.tag = "90% OFF";
  assert.equal(normalizeShopping(f, query).deals.length, 0);
  p.tag = "Clearance";
  assert.equal(normalizeShopping(f, query).deals[0].kind, "clearance");
  p.price = "$0.01"; p.extracted_price = 0.01;
  assert.equal(normalizeShopping(f, query).deals[0].kind, "penny");
  for (const price of ["CA$0.01", "€0.01", "$0.01/month", "$0.02"]) {
    p.price = price; assert.equal(normalizeShopping(f, query).deals.length, 0);
  }
  p.price = "$0.01"; p.currency = "CAD";
  assert.equal(normalizeShopping(f, query).deals.length, 0);
  p.currency = "USD"; p.extracted_price = NaN;
  assert.equal(normalizeShopping(f, query).deals.length, 0);
});
test("deduplicates categorized results and distinguishes empty results from broken responses", () => {
  const f = fixture(); f.categorized_shopping_results = [{ shopping_results: [product()] }];
  assert.equal(normalizeShopping(f, query).deals.length, 1);
  f.shopping_results = []; delete f.categorized_shopping_results;
  assert.equal(normalizeShopping(f, query).deals.length, 0);
  delete f.shopping_results;
  assert.throws(() => normalizeShopping(f, query), /INVALID_RESPONSE/);
  assert.throws(() => normalizeShopping(null, query), /PROVIDER_FAILED/);
});
test("wrong query, ZIP, country and provider context fail closed", () => {
  for (const [key, value] of [["engine", "google"], ["q", "other"], ["gl", "ca"], ["hl", "vi"], ["location_requested", "10001,United States"]]) {
    const f = fixture(); f.search_parameters[key] = value;
    assert.throws(() => normalizeShopping(f, query), /CONTEXT_MISMATCH/);
  }
});
test("online searches cannot spend credits on duplicate pages or category/filter/sort variants", async () => {
  let calls = 0;
  const request = async (params: Record<string, string>) => { calls++; assert.equal(params.sort_by, undefined); return fixture(); };
  await discoverShopping(query, request, async zip => `${zip},United States`); assert.equal(calls, 1);
  await assert.rejects(discoverShopping({ ...query, page: 2 }, request));
  await assert.rejects(discoverShopping({ ...query, category: "tools" }, request));
  await assert.rejects(discoverShopping({ ...query, retailer: "home-depot" }, request));
  assert.equal(calls, 1);
  assert.equal(discoveryCacheScope(query).key, discoveryCacheScope({ ...query, radiusMiles: 5, kind: "penny" }).key);
  assert.notEqual(discoveryCacheScope(query).key, discoveryCacheScope({ ...query, retailer: "cvs" }).key);
});
test("ZIP locations use a verified state and failed lookups avoid paid requests", async () => {
  const location = await shoppingLocation("33511", async () => Response.json({"post code":"33511","country abbreviation":"US",places:[{state:"Florida"}]}));
  assert.equal(location, "33511,Florida,United States");
  await assert.rejects(shoppingLocation("33511", async () => Response.json({"post code":"10001","country abbreviation":"US",places:[{state:"Florida"}]})), /ZIP_LOOKUP_UNAVAILABLE/);
  await assert.rejects(shoppingLocation("33511", async () => new Response("", {status:404})), /ZIP code was not found/);
  let calls = 0;
  await assert.rejects(discoverShopping(query, async () => { calls++; return fixture(); }, async () => { throw Error("lookup failed"); }));
  assert.equal(calls, 0);
  const f = fixture(); f.search_parameters.location_requested = location;
  assert.equal(normalizeShopping(f, query, location).deals.length, 1);
  assert.throws(() => normalizeShopping(f, query, "10001,New York,United States"), /CONTEXT_MISMATCH/);
});
