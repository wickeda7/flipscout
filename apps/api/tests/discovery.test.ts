import { test } from "node:test";
import assert from "node:assert/strict";
import { HomeDepotDiscovery, normalizeDiscovery, parseDiscoveryQuery } from "../src/retailers/home-depot-discovery.js";
import { requestSerpApi } from "../src/retailers/serpapi-request.js";
const near = async()=>({latitude:27.94,longitude:-82.26});
const query = { category: "tools", kind: "all", page: 1 } as const;
const fixture = (): any => ({
  search_metadata: { status: "Success", created_at: "2026-09-09 12:00:00 UTC" },
  search_parameters: { q: "tools", store_id: "6305", delivery_zip: "33511", nao: 0 },
  search_information: { store_id: "6305", store_name: "East Brandon" },
  products: [{ product_id: "123456789", title: "Fixture tool", price: 20, price_was: 30, price_badge: "Special-Buy" }],
  serpapi_pagination: { next: "https://serpapi.com/search?api_key=never-forward" }
});
test("maps documented search markdown fields and strips provider URLs", () => {
  const r = normalizeDiscovery(fixture(), query);
  assert.equal(r.deals[0].kind, "sale"); assert.equal(r.deals[0].savings, 10);
  assert.equal(r.deals[0].originalPrice, 30); assert.equal(r.hasMore, true);
  assert.equal(r.providerCreatedAt, "2026-09-09T12:00:00.000Z");
  assert.doesNotMatch(JSON.stringify(r), /api_key|never-forward/);
});
test("only explicit clearance badges or exact one-cent prices qualify", () => {
  const f=fixture(); f.products=[
    {product_id:"123456789",title:"Clearance tool",price:20},
    {product_id:"123456780",title:"Tool",price:20,price_badge:"Clearance"},
    {product_id:"123456781",title:"Tool",price:0.01},
    {product_id:"123456782",title:"Tool",price:0},
    {product_id:"123456783",title:"Tool",price:"0.01"}
  ];
  const r=normalizeDiscovery(f,query);
  assert.deepEqual(r.deals.map(d=>d.kind),["clearance","penny"]); assert.equal(r.skippedProducts,1);
  assert.equal(normalizeDiscovery(f,{...query,kind:"penny"}).deals.length,1);
});
test("delivery and ship-to-store quantities never become local inventory", () => {
  const f=fixture(); f.products[0].pickup={free_ship_to_store:true,quantity:999};
  f.products[0].delivery={quantity:500};
  assert.equal(normalizeDiscovery(f,query).deals[0].quantity,null);
  assert.equal(normalizeDiscovery(f,query).deals[0].pickupText,null);
});
test("rejects wrong store, ZIP, category or pagination context", () => {
  for(const [key,value] of [["store_id","1234"],["delivery_zip","00000"],["q","lighting"],["nao",24]]) {
    const f=fixture(); f.search_parameters[key]=value;
    assert.throws(()=>normalizeDiscovery(f,query),/CONTEXT_MISMATCH/);
  }
});
test("missing and failed responses cannot masquerade as empty inventories", () => {
  assert.throws(()=>normalizeDiscovery(null,query),/PROVIDER_FAILED/);
  const f=fixture(); delete f.products;
  assert.throws(()=>normalizeDiscovery(f,query),/INVALID_RESPONSE/);
  f.search_information.total_results=0;assert.deepEqual(normalizeDiscovery(f,query).deals,[]);
  f.error="provider error";assert.throws(()=>normalizeDiscovery(f,query),/PROVIDER_FAILED/);
});
test("deduplicates products and drops untrusted image locations", () => {
  const f=fixture();f.products[0].thumbnails=[["https://untrusted.example/image"]];
  f.products.push({...f.products[0]});
  const r=normalizeDiscovery(f,query);assert.equal(r.deals.length,1);assert.equal(r.deals[0].imageUrl,null);
});
test("filters and pages are bounded and cannot override provider credentials", () => {
  for(const input of ["api_key=x","page=11","page=-1","category=__proto__","kind=x","page=1&page=2"])
    assert.throws(()=>parseDiscoveryQuery(new URLSearchParams(input)),/Invalid deal filters/);
  assert.deepEqual(parseDiscoveryQuery(new URLSearchParams()),{...query,category:"all",zip:"33511",radiusMiles:25});
});
test("coalesces concurrent identical searches, caches and clones results", async () => {
  let calls=0;
  const discovery=new HomeDepotDiscovery(async()=>{calls++;await new Promise(r=>setTimeout(r,5));return fixture();},Date.now,near);
  const [a,b]=await Promise.all([discovery.search(query),discovery.search(query)]);
  a.deals.length=0;assert.equal(b.deals.length,1);
  assert.equal((await discovery.search(query)).deals.length,1);assert.equal(calls,1);
});
test("failed searches can be retried and expired cache is refreshed", async () => {
  let calls=0,now=0;
  const discovery=new HomeDepotDiscovery(async()=>{calls++;if(calls===1)throw Error("fixture failure");return fixture();},()=>now,near);
  await assert.rejects(discovery.search(query));await discovery.search(query);
  now=600001;await discovery.search(query);assert.equal(calls,3);
});
test("penny searches are bounded by price and pagination stays provider-independent", async () => {
  const discovery=new HomeDepotDiscovery(async params=>{
    assert.equal(params.upperbound,"0.01");assert.equal(params.nao,"216");
    const f=fixture();f.search_parameters.nao=216;return f;
  },Date.now,near);
  assert.equal((await discovery.search({...query,kind:"penny",page:10})).hasMore,false);
});
test("request uses fixed host and redirects are refused", async () => {
  await requestSerpApi({engine:"home_depot"},"fixture-secret",(async(url,init)=>{
    const u=new URL(String(url));assert.equal(u.origin,"https://serpapi.com");
    assert.equal(init?.redirect,"error");assert.equal(u.searchParams.get("api_key"),"fixture-secret");
    return Response.json(fixture());
  }) as typeof fetch);
});
test("network failures and timeouts are safe and never automatically retried", async () => {
  let calls=0;
  await assert.rejects(requestSerpApi({},"secret",(async()=>{calls++;throw Error("secret");}) as typeof fetch),/SERPAPI_NETWORK_ERROR/);
  assert.equal(calls,1);
  await assert.rejects(requestSerpApi({},"secret",((_url,init)=>new Promise((_resolve,reject)=>{
    init!.signal!.addEventListener("abort",()=>reject(Error("secret")),{once:true});
  })) as typeof fetch,5),/SERPAPI_TIMEOUT/);
  await assert.rejects(requestSerpApi({},""),/SERPAPI_KEY_MISSING/);
});
test("rejects invalid JSON, non-JSON and oversized responses", async () => {
  for(const [response,code] of [
    [new Response("bad",{headers:{"content-type":"application/json"}}),/INVALID_PROVIDER_JSON/],
    [new Response("<html>"),/INVALID_PROVIDER_RESPONSE/],
    [Response.json({data:"x".repeat(4000001)}),/PROVIDER_RESPONSE_TOO_LARGE/],
    [new Response("private",{status:503}),/SERPAPI_HTTP_503/]
  ] as const) await assert.rejects(requestSerpApi({},"secret",(async()=>response) as typeof fetch),code);
});

test("ZIP and radius validation preserve leading zeros and reject values above 25", () => {
  assert.equal(parseDiscoveryQuery(new URLSearchParams("zip=00501&radiusMiles=5")).zip,"00501");
  for(const q of ["zip=1234","zip=abcde","radiusMiles=26","radiusMiles=0","radiusMiles=2.5","zip=33511&zip=10001"])
    assert.throws(()=>parseDiscoveryQuery(new URLSearchParams(q)),/Invalid deal filters/);
});
test("out-of-radius location avoids paid search and distinguishes missing coverage", async () => {
  let calls=0;
  const service=new HomeDepotDiscovery(async()=>{calls++;return fixture();},Date.now,async()=>({latitude:40.75,longitude:-73.99}));
  const result=await service.search({...query,zip:"10001",radiusMiles:25});
  assert.equal(calls,0);assert.equal(result.location?.covered,false);assert.equal(result.productsChecked,0);
});
test("in-radius location preserves selected ZIP without changing retailer store context", async () => {
  const service=new HomeDepotDiscovery(async params=>{
    assert.equal(params.store_id,"6305");assert.equal(params.delivery_zip,"33511");return fixture();
  },Date.now,near);
  const result=await service.search({...query,zip:"33594",radiusMiles:5});
  assert.equal(result.location?.zip,"33594");assert.equal(result.location?.covered,true);
});

test("automatic discovery merges five groups, deduplicates and limits concurrency", async()=>{
  let active=0,peak=0,calls=0;
  const service=new HomeDepotDiscovery(async params=>{
    calls++;active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,2));
    active--;
    const f=fixture();f.search_parameters.q=params.q;return f;
  },Date.now,near);
  const r=await service.search({...query,category:"all"});
  assert.equal(calls,5);assert.equal(peak,2);assert.equal(r.deals.length,1);
  assert.deepEqual(r.coverage,{completed:5,failed:0,total:5});
  assert.equal(r.query.category,"all");
  await service.search({...query,category:"all"});assert.equal(calls,5);
});
test("automatic discovery reports partial coverage and total failure distinctly", async()=>{
  const service=new HomeDepotDiscovery(async params=>{
    if(params.q==="tools")throw Error("fixture failure");
    const f=fixture();f.search_parameters.q=params.q;return f;
  },Date.now,near);
  const r=await service.search({...query,category:"all"});
  assert.deepEqual(r.coverage,{completed:4,failed:1,total:5});
  const failed=new HomeDepotDiscovery(async()=>{throw Error("fixture failure");},Date.now,near);
  await assert.rejects(failed.search({...query,category:"all"}),/fixture failure/);
});
