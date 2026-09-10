import { discoveryRetailers } from "@flipscout/types";
import { locateZip, distanceMiles } from "./discovery-location.js";
import type { DiscoveryQuery, DiscoveryResponse, DiscoveredDeal } from "@flipscout/types";
import { RequestError } from "../security/request-error.js";
import { ConnectorError } from "../ingestion/http-config.js";
import { requestSerpApi } from "./serpapi-request.js";
export const categories = {tools:"tools",appliances:"appliances",lighting:"lighting",garden:"lawn and garden",storage:"storage"};
export function parseDiscoveryQuery(params: URLSearchParams): DiscoveryQuery {
  const invalid=():never=>{throw new RequestError("Invalid deal filters.",400,"INVALID_DISCOVERY_QUERY");};
  for(const key of params.keys())if(!["category","kind","page","zip","radiusMiles","retailer"].includes(key)||params.getAll(key).length!==1)invalid();
  const category=params.get("category")??"all",kind=params.get("kind")??"all",page=params.get("page")??"1";
  if((category!=="all"&&!Object.hasOwn(categories,category))||!["all","sale","clearance","penny"].includes(kind)||!/^([1-9]|10)$/.test(page))invalid();
  const zip=params.get("zip")??"33511",radius=params.get("radiusMiles")??"25";
  if(!/^\d{5}$/.test(zip)||! /^(?:[1-9]|1[0-9]|2[0-5])$/.test(radius))invalid();
  const retailer=params.get("retailer")??"home-depot";
  if(!discoveryRetailers.some(r=>r.id===retailer))invalid();
  return {retailer:retailer as DiscoveryQuery["retailer"],zip,radiusMiles:Number(radius),category:category as DiscoveryQuery["category"],kind:kind as DiscoveryQuery["kind"],page:Number(page)};
}
const obj=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const amount=(v:unknown):number|null=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
const cleanText=(v:unknown,max=400):string|null=>typeof v==="string"&&v.trim()?v.trim().slice(0,max):null;
function imageUrl(p:any):string|null {
  const value=p.thumbnails?.[0]?.[0];if(typeof value!=="string")return null;
  try {const u=new URL(value);return u.protocol==="https:"&&u.hostname==="images.thdstatic.com"&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function normalizeDiscovery(raw:unknown,query:DiscoveryQuery,now=new Date().toISOString()):DiscoveryResponse {
  if(!obj(raw)||raw.error||raw.search_metadata?.status!=="Success")throw new ConnectorError("DISCOVERY_PROVIDER_FAILED");
  if(String(raw.search_parameters?.store_id)!=="6305"||String(raw.search_parameters?.delivery_zip)!=="33511"||
    (query.category==="all"||raw.search_parameters?.q!==categories[query.category])||
    Number(raw.search_parameters?.nao??0)!==(query.page-1)*24)throw new ConnectorError("DISCOVERY_CONTEXT_MISMATCH");
  if(raw.search_information?.store_id!==undefined&&String(raw.search_information.store_id)!=="6305")throw new ConnectorError("DISCOVERY_CONTEXT_MISMATCH");
  // An absent products array is only empty when the provider explicitly reports zero results.
  if(!Array.isArray(raw.products)&&raw.search_information?.total_results!==0)throw new ConnectorError("DISCOVERY_INVALID_RESPONSE");
  const rows=raw.products??[];if(rows.length>100)throw new ConnectorError("DISCOVERY_INVALID_RESPONSE");
  const deals:DiscoveredDeal[]=[];const seen=new Set<string>();let skippedProducts=0;
  for(const p of rows) {
    if(!obj(p)||!/^\d{9}$/.test(String(p.product_id))||!cleanText(p.title)||amount(p.price)===null){skippedProducts++;continue;}
    const id=String(p.product_id);if(seen.has(id))continue;seen.add(id);
    const price=p.price as number,original=amount(p.price_was);
    const promotion=cleanText(p.price_badge,80);
    // Product titles and search keywords are never proof of clearance.
    const isClearance=promotion?.toLowerCase()==="clearance";
    const isSale=original!==null&&original>price;
    const kind=price===0.01?"penny":isClearance?"clearance":isSale?"sale":null;
    if(!kind||(query.kind!=="all"&&query.kind!==kind))continue;
    deals.push({id,title:cleanText(p.title)!,price,originalPrice:isSale?original:null,savings:isSale?Math.round((original!-price)*100)/100:null,
      kind,promotion,productUrl:`https://www.homedepot.com/p/${id}`,imageUrl:imageUrl(p),pickupText:cleanText(p.pickup),quantity:null});
  }
  const created=raw.search_metadata?.created_at;
  const time=typeof created==="string"&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/.test(created)?Date.parse(created.replace(" ","T").replace(" UTC","Z")):NaN;
  return {source:"serpapi-home-depot",retailer:"Home Depot",storeId:"6305",storeName:cleanText(raw.search_information?.store_name)??"East Brandon",zip:"33511",query,
    fetchedAt:now,providerCreatedAt:Number.isFinite(time)?new Date(time).toISOString():null,deals,productsChecked:rows.length,skippedProducts,
    hasMore:query.page<10&&(!!raw.serpapi_pagination?.next||!!raw.pagination?.next)};
}
export class HomeDepotDiscovery {
  private providerActive=0;
  private providerQueue:(()=>void)[]=[];
  private async fetchPage(params:Record<string,string>):Promise<unknown> {
    if(this.providerActive>=2)await new Promise<void>(resolve=>this.providerQueue.push(resolve));
    else this.providerActive++;
    try {return await this.request(params);}
    finally {
      const next=this.providerQueue.shift();
      if(next)next();else this.providerActive--;
    }
  }
  private cache=new Map<string,{expires:number;result:DiscoveryResponse}>();
  private running=new Map<string,Promise<DiscoveryResponse>>();
  constructor(private readonly request:typeof requestSerpApi=requestSerpApi,private readonly now=Date.now,private readonly locate:typeof locateZip=locateZip){}
  async search(query:DiscoveryQuery):Promise<DiscoveryResponse> {
    if(query.retailer&&query.retailer!=="home-depot")throw new ConnectorError("RETAILER_NOT_CONNECTED");
    query={...query,retailer:"home-depot",zip:query.zip??"33511",radiusMiles:query.radiusMiles??25};
    const key=JSON.stringify(query),cached=this.cache.get(key);
    if(cached&&cached.expires>this.now())return structuredClone(cached.result);
    const pending=this.running.get(key);if(pending)return structuredClone(await pending);
    // Bound concurrent paid requests across this API process.
    if(this.running.size>=2)throw new ConnectorError("DISCOVERY_BUSY");
    const task=(async()=>{
      const distance=distanceMiles(await this.locate(query.zip!));
      const location={zip:query.zip!,radiusMiles:query.radiusMiles!,distanceMiles:Math.round(distance*10)/10,covered:distance<=query.radiusMiles!};
      if(!location.covered)return {source:"serpapi-home-depot" as const,retailer:"Home Depot" as const,storeId:"6305" as const,
        storeName:"East Brandon",zip:"33511" as const,query,location,fetchedAt:new Date(this.now()).toISOString(),
        providerCreatedAt:null,deals:[],productsChecked:0,skippedProducts:0,hasMore:false};
      const scopes=query.category==="all"?Object.keys(categories) as (keyof typeof categories)[]:[query.category];
      const pages=await Promise.allSettled(scopes.map(async category=>{
        const params:Record<string,string>={engine:"home_depot",q:categories[category],store_id:"6305",delivery_zip:"33511",ps:"24",nao:String((query.page-1)*24)};
        if(query.kind==="penny"){params.upperbound="0.01";params.hd_sort="price_low_to_high";}
        return normalizeDiscovery(await this.fetchPage(params),{...query,category},new Date(this.now()).toISOString());
      }));
      const successful=pages.flatMap(p=>p.status==="fulfilled"?[p.value]:[]);
      if(!successful.length) {
        const failure=pages.find(p=>p.status==="rejected") as PromiseRejectedResult;
        throw failure.reason;
      }
      const unique=new Map<string,DiscoveredDeal>();
      for(const page of successful)for(const deal of page.deals)if(!unique.has(deal.id))unique.set(deal.id,deal);
      const result:DiscoveryResponse={...successful[0],query,deals:[...unique.values()],
        fetchedAt:new Date(this.now()).toISOString(),
        providerCreatedAt:successful.every(p=>p.providerCreatedAt!==null)
          ?successful.map(p=>p.providerCreatedAt!).sort()[0]:null,
        productsChecked:successful.reduce((n,p)=>n+p.productsChecked,0),
        skippedProducts:successful.reduce((n,p)=>n+p.skippedProducts,0),
        hasMore:successful.some(p=>p.hasMore),
        coverage:{completed:successful.length,failed:pages.length-successful.length,total:pages.length}};
      result.location=location;
      if(this.cache.size>=50)this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key,{expires:this.now()+10*60*1000,result});return result;
    })();
    this.running.set(key,task);
    try{return structuredClone(await task);}finally{this.running.delete(key);}
  }
}
