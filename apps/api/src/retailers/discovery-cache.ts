import { discoverWalmart } from "./walmart-discovery.js";
import { Pool } from "pg";
import { RequestError } from "../security/request-error.js";
import type { DiscoveryQuery, DiscoveryResponse } from "@flipscout/types";
import { ConnectorError } from "../ingestion/http-config.js";
import { HomeDepotDiscovery } from "./home-depot-discovery.js";
import { discoverShopping, isShoppingRetailer, shoppingParams } from "./shopping-discovery.js";

export interface CacheClient {
  query(sql:string,values?:any[]):Promise<{rows:any[]}>;
  release(error?:boolean):void;
}
export interface CachePool { connect():Promise<CacheClient>; end?():Promise<void> }
export function discoveryCacheScope(input:DiscoveryQuery) {
  if (isShoppingRetailer(input.retailer)) shoppingParams(input);
  // Radius is applied after retrieving the maximum supported area. Deal types filter locally.
  const query:DiscoveryQuery={retailer:input.retailer??"home-depot",zip:input.zip??"33511",
    category:input.category,kind:"all",page:input.page,radiusMiles:25};
  return {query,key:JSON.stringify([isShoppingRetailer(query.retailer)?"shopping-v1":"discovery-v1",query.zip,query.retailer,query.category,query.page])};
}
export function discoverRetailer(query:DiscoveryQuery):Promise<DiscoveryResponse> {
  if(isShoppingRetailer(query.retailer))return discoverShopping(query);
  if(query.retailer==="walmart")return discoverWalmart(query);
  if(!query.retailer||query.retailer==="home-depot")return new HomeDepotDiscovery().search(query);
  throw new RequestError("Unsupported retailer.",400,"INVALID_DISCOVERY_QUERY");
}
export class DatabaseDiscovery {
  constructor(private readonly pool:CachePool|null,private readonly fetchLive:(q:DiscoveryQuery)=>Promise<DiscoveryResponse> = discoverRetailer) {}
  async close(){await this.pool?.end?.();}
  async search(input:DiscoveryQuery):Promise<DiscoveryResponse> {
    if(!this.pool)throw new ConnectorError("DISCOVERY_DATABASE_REQUIRED");
    const {query,key}=discoveryCacheScope(input);
    let client:CacheClient;
    try {client=await this.pool.connect();}catch {throw new ConnectorError("DISCOVERY_DATABASE_UNAVAILABLE");}
    let locked=false,destroy=false;
    const present=(row:any,source:"database"|"provider")=>{
      const result:DiscoveryResponse=structuredClone(row.result);
      result.offerScope??=result.source==="serpapi-home-depot"?"store-context":"online";
      result.query={...query,radiusMiles:input.radiusMiles??25};
      result.cache={source,fetchedAt:new Date(row.fetched_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString()};
      if(result.location){
        result.location.radiusMiles=input.radiusMiles??25;
        result.location.covered=result.location.covered&&result.location.distanceMiles<=result.location.radiusMiles;
        if(!result.location.covered){result.deals=[];result.hasMore=false;}
      }
      return result;
    };
    try {
      const read=()=>client.query("SELECT result,fetched_at,expires_at FROM discovery_search_cache WHERE cache_key=$1 AND expires_at > clock_timestamp()",[key]);
      let found=await read();
      if(found.rows[0])return present(found.rows[0],"database");
      // Cross-process protection: another API worker must not duplicate a paid request.
      const lock=await client.query("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",[key]);
      locked=lock.rows[0]?.locked===true;
      if(!locked)throw new ConnectorError("DISCOVERY_BUSY");
      found=await read();
      if(found.rows[0])return present(found.rows[0],"database");
      const result=await this.fetchLive(query);
      const saved=await client.query(
        "INSERT INTO discovery_search_cache(cache_key,zip_code,retailer,scope,result,fetched_at,expires_at) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,clock_timestamp(),clock_timestamp()+interval '12 hours') ON CONFLICT(cache_key) DO UPDATE SET scope=EXCLUDED.scope,result=EXCLUDED.result,fetched_at=EXCLUDED.fetched_at,expires_at=EXCLUDED.expires_at RETURNING result,fetched_at,expires_at",
        [key,query.zip,query.retailer,JSON.stringify(query),JSON.stringify(result)]);
      return present(saved.rows[0],"provider");
    }catch(error){
      if(error instanceof ConnectorError||error instanceof RequestError)throw error;
      if((error as {code?:string})?.code==="42P01")throw new ConnectorError("DISCOVERY_DATABASE_MIGRATION_REQUIRED");
      throw new ConnectorError("DISCOVERY_DATABASE_UNAVAILABLE");
    }finally{
      if(locked)try{await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))",[key]);}catch{destroy=true;}
      client.release(destroy);
    }
  }
}
export function createDatabaseDiscovery(){
  return new DatabaseDiscovery(process.env.DATABASE_URL?new Pool({
    connectionString:process.env.DATABASE_URL,max:4,connectionTimeoutMillis:10000,
    ssl:process.env.DATABASE_SSL==="true"?{rejectUnauthorized:true}:undefined
  }):null);
}
