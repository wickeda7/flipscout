import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchHomeDepotPilot, normalizeHomeDepotPilot } from "../src/retailers/home-depot-pilot.js";
const query = {productId:"326290517",storeId:"6305",zip:"33511"};
const fixture = () => ({search_metadata:{status:"Success",created_at:"2026-09-09 12:00:00 UTC"},
  search_parameters:{product_id:query.productId,store_id:query.storeId,delivery_zip:query.zip},
  product_results:{product_id:query.productId,title:"Fixture",price:99,upc:"001234",store_sku_number:"0011",
    fulfillment:{store:"East Brandon",options:[{type:"Ship to Home",quantity:500},{type:"Store Pickup",quantity:3}]}}});
test("preserves pickup quantity, string identifiers and timestamp provenance",()=>{
  const r=normalizeHomeDepotPilot(fixture(),query);assert.equal(r.pickupQuantity,3);assert.equal(r.upc,"001234");
  assert.equal(r.retailerObservedAt,null);assert.equal(r.providerCreatedAt,"2026-09-09T12:00:00.000Z");assert.equal(r.clearanceVerified,false);
});
test("delivery stock cannot become local inventory",()=>{
  const f=fixture();f.product_results.fulfillment.options=[{type:"Ship to Home",quantity:500}];
  const r=normalizeHomeDepotPilot(f,query);assert.equal(r.pickupQuantity,null);assert.equal(r.availability,"unknown");
});
test("rejects mismatched product and store context",()=>{
  const f=fixture();f.search_parameters.store_id="1234";assert.throws(()=>normalizeHomeDepotPilot(f,query),/SEARCH_CONTEXT_MISMATCH/);
  const g=fixture();g.product_results.product_id="123456789";assert.throws(()=>normalizeHomeDepotPilot(g,query),/PRODUCT_IDENTITY_MISMATCH/);
});
test("penny signal remains an unverified candidate",()=>{
  const f=fixture();f.product_results.price=0.01;const r=normalizeHomeDepotPilot(f,query);
  assert.equal(r.pennyCandidate,true);assert.equal(r.clearanceVerified,false);assert.ok(r.warnings.includes("PENNY_PRICE_REQUIRES_REGISTER_VERIFICATION"));
});
test("credentials stay at fixed provider endpoint and outside results",async()=>{
  const r=await fetchHomeDepotPilot(query,"test-secret",(async(url,init)=>{
    const u=new URL(String(url));assert.equal(u.origin,"https://serpapi.com");assert.equal(u.searchParams.get("api_key"),"test-secret");
    assert.equal(init?.redirect,"error");return new Response(JSON.stringify(fixture()),{headers:{"content-type":"application/json"}});
  }) as typeof fetch);
  assert.doesNotMatch(JSON.stringify(r),/test-secret|api_key/);
});
test("missing key, upstream failures and timeouts do not retry or expose errors",async()=>{
  await assert.rejects(fetchHomeDepotPilot(query,""),/SERPAPI_KEY_MISSING/);
  let calls=0;await assert.rejects(fetchHomeDepotPilot(query,"secret",(async()=>{calls++;throw new Error("api_key=secret");}) as typeof fetch),/SERPAPI_NETWORK_ERROR/);assert.equal(calls,1);
  await assert.rejects(fetchHomeDepotPilot(query,"secret",((_url,init)=>new Promise((_resolve,reject)=>{
    init!.signal!.addEventListener("abort",()=>reject(new Error("secret")),{once:true});
  })) as typeof fetch,5),/SERPAPI_TIMEOUT/);
});
