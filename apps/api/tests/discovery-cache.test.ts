import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {config} from "dotenv";
import {Pool} from "pg";
import {DatabaseDiscovery,discoveryCacheScope} from "../src/retailers/discovery-cache.js";
import type {DiscoveryQuery,DiscoveryResponse} from "@flipscout/types";
config({path:process.env.FLIPSCOUT_ENV_FILE??new URL("../.env",import.meta.url).pathname});
const query:DiscoveryQuery={retailer:"home-depot",category:"all",kind:"all",page:1,zip:"00501",radiusMiles:25};
const fixture=():DiscoveryResponse=>({source:"serpapi-home-depot",retailer:"Home Depot",storeId:"6305",storeName:"East Brandon",zip:"33511",query,
 fetchedAt:new Date().toISOString(),providerCreatedAt:null,deals:[],productsChecked:24,skippedProducts:0,hasMore:true,
 location:{zip:"33511",radiusMiles:25,distanceMiles:12,covered:true},coverage:{completed:2,failed:3,total:5}});
test("cache identity separates ZIP, retailer and page but reuses filters and radius",()=>{
 const key=discoveryCacheScope(query).key;
 assert.equal(discoveryCacheScope({...query,kind:"sale",radiusMiles:5,retryFailed:true}).key,key);
 for(const q of [{...query,zip:"10001"},{...query,retailer:"walmart" as const},{...query,page:2}])
   assert.notEqual(discoveryCacheScope(q).key,key);
});
test("missing database and competing worker fail before retailer calls",async()=>{
 let calls=0;const fetcher=async()=>{calls++;return fixture();};
 await assert.rejects(new DatabaseDiscovery(null,fetcher).search(query),/DATABASE_REQUIRED/);
 const busy={connect:async()=>({query:async(sql:string)=>({rows:sql.includes("pg_try")?[{locked:false}]:[]}),release:()=>{}})};
 await assert.rejects(new DatabaseDiscovery(busy,fetcher).search(query),/DISCOVERY_BUSY/);
 assert.equal(calls,0);
});
test("real PostgreSQL: 12-hour cache, expiry, partial reuse and persisted reads", {skip:!process.env.DATABASE_URL},async()=>{
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000,
 ssl:process.env.DATABASE_SSL==="true"?{rejectUnauthorized:true}:undefined});
 try{
   // Temporary table shadows the production table on this dedicated connection.
   const sql=await readFile(new URL("../../../database/discovery-cache.sql",import.meta.url),"utf8");
   await pool.query(sql.replace("CREATE TABLE IF NOT EXISTS","CREATE TEMP TABLE").split("CREATE INDEX")[0]);
   let calls=0,fail=false;
   const fetcher=async()=>{calls++;if(fail)throw Error("private");return fixture();};
   const first=await new DatabaseDiscovery(pool,fetcher).search(query);
   assert.equal(first.cache?.source,"provider");assert.equal(calls,1);
   const lifetime=Date.parse(first.cache!.expiresAt)-Date.parse(first.cache!.fetchedAt);
   assert.ok(Math.abs(lifetime-43200000)<10);
   const second=await new DatabaseDiscovery(pool,fetcher).search({...query,retryFailed:true});
   assert.equal(second.cache?.source,"database");assert.equal(calls,1);
   assert.equal(second.cache?.expiresAt,first.cache?.expiresAt);
   assert.equal(second.coverage?.failed,3);
   const smaller=await new DatabaseDiscovery(pool,fetcher).search({...query,radiusMiles:5});
   assert.equal(smaller.location?.covered,false);assert.equal(calls,1);
   assert.equal((await new DatabaseDiscovery(pool,fetcher).search(query)).location?.covered,true);
   await pool.query("UPDATE discovery_search_cache SET expires_at=clock_timestamp()-interval '1 second'");
   await new DatabaseDiscovery(pool,fetcher).search(query);assert.equal(calls,2);
   await pool.query("UPDATE discovery_search_cache SET expires_at=clock_timestamp()-interval '1 second'");
   fail=true;
   await assert.rejects(new DatabaseDiscovery(pool,fetcher).search(query));
   const stale=await pool.query("SELECT expires_at<clock_timestamp() AS expired FROM discovery_search_cache");
   assert.equal(stale.rows[0].expired,true);
 }finally{await pool.end();}
});
