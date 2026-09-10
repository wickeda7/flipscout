import { test } from "node:test";
import assert from "node:assert/strict";
import { BestBuyClient, parseBestBuyQuery } from "../src/retailers/bestbuy.js";
const product={sku:123,name:"Fixture product",regularPrice:50,salePrice:30};
const inventory={stores:[{storeID:"001",name:"Fixture",city:"City",state:"FL",distance:4.5,lowStock:false}]};
const json=(data:unknown,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...headers}});
function client(replies:Response[]) {return new BestBuyClient("fixture-key",(async(url,options)=>{
  assert.equal(new URL(String(url)).hostname,"api.bestbuy.com"); assert.equal(options?.redirect,"error");
  assert.equal(new URL(String(url)).searchParams.get("apiKey"),"fixture-key");
  assert.ok(replies.length);return replies.shift()!;
}) as typeof fetch,async()=>{});}
test("Best Buy response preserves unknown quantities and catalog pricing",async()=>{
  const r=await client([json(product),json(inventory)]).availability("32746","123");
  assert.equal(r.stores[0].inventory,null);assert.equal(r.stores[0].availability,"in-stock");assert.equal(r.priceScope,"catalog");
  assert.equal(r.salePrice,30);assert.doesNotMatch(JSON.stringify(r),/fixture-key|apiKey/);
});
test("query input cannot alter retailer paths",()=>{
  for(const query of ["zip=32746&sku=../private","zip=1&sku=123","zip=32746&sku=123&sku=456","zip=32746&sku=123&token=x"])
    assert.throws(()=>parseBestBuyQuery(new URLSearchParams(query)),{code:"INVALID_RETAILER_QUERY"});
});
test("missing keys and access errors are safe and do not retry",async()=>{
  await assert.rejects(new BestBuyClient("").availability("32746","123"),{code:"RETAILER_NOT_CONFIGURED"});
  await assert.rejects(client([json({message:"secret provider body"},403)]).availability("32746","123"),{code:"RETAILER_ACCESS_FAILED"});
});
test("retries transient responses and rejects excessive retry delays",async()=>{
  assert.equal((await client([json({},503),json(product),json(inventory)]).availability("32746","123")).stores.length,1);
  await assert.rejects(client([json({},429,{"retry-after":"60"})]).availability("32746","123"),{code:"RETAILER_UNAVAILABLE"});
});
test("empty availability is genuine empty data, malformed responses fail",async()=>{
  assert.deepEqual((await client([json(product),json({stores:[]})]).availability("32746","123")).stores,[]);
  await assert.rejects(client([json(product),json({})]).availability("32746","123"),{code:"RETAILER_INVALID_RESPONSE"});
});
test("network errors are redacted and bounded",async()=>{
  let calls=0;const c=new BestBuyClient("fixture-key",(async()=>{calls++;throw new Error("url?apiKey=secret");}) as typeof fetch,async()=>{});
  await assert.rejects(c.availability("32746","123"),{code:"RETAILER_UNAVAILABLE"});assert.equal(calls,3);
});
test("timeouts abort each attempt and stop after three requests",async()=>{
  let calls=0;
  const c=new BestBuyClient("fixture-key",((_url,options)=>new Promise((_resolve,reject)=>{
    calls++;options!.signal!.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
  })) as typeof fetch,async()=>{},5);
  await assert.rejects(c.availability("32746","123"),{code:"RETAILER_UNAVAILABLE"});assert.equal(calls,3);
});
