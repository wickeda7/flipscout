import type {DiscoveryQuery,DiscoveryResponse,DiscoveredDeal} from "@flipscout/types";
import {ConnectorError} from "../ingestion/http-config.js";
import {requestSerpApi} from "./serpapi-request.js";
export function normalizeWalmart(raw:any,query:DiscoveryQuery):DiscoveryResponse {
  if(!raw||raw.error||raw.search_metadata?.status!=="Success")throw new ConnectorError("DISCOVERY_PROVIDER_FAILED");
  const location=raw.search_information?.location;
  if(raw.search_parameters?.engine!=="walmart"||raw.search_parameters?.query!=="clearance"||
    String(raw.search_parameters?.store_id)!=="3463"||String(location?.store_id)!=="3463"||
    location?.postal_code!=="33511"||Number(raw.search_parameters?.page??1)!==query.page)
    throw new ConnectorError("DISCOVERY_CONTEXT_MISMATCH");
  if(!Array.isArray(raw.organic_results))throw new ConnectorError("DISCOVERY_INVALID_RESPONSE");
  const deals:DiscoveredDeal[]=[];const seen=new Set<string>();let skippedProducts=0;
  for(const product of raw.organic_results){
    const offer=product?.primary_offer,id=String(product?.us_item_id??"");
    if(!/^\d{1,20}$/.test(id)||typeof product.title!=="string"||!product.title.trim()||
      offer?.currency!=="USD"||typeof offer.offer_price!=="number"||!Number.isFinite(offer.offer_price)||offer.offer_price<0){
      skippedProducts++;continue;
    }
    // Third-party seller offers are not store clearance inventory.
    if(!["Walmart.com","Walmart"].includes(product.seller_name))continue;
    if(seen.has(id))continue;seen.add(id);
    const price=offer.offer_price;
    const original=typeof offer.was_price==="number"&&Number.isFinite(offer.was_price)&&offer.was_price>price?offer.was_price:null;
    const clearance=typeof product.special_offer_text==="string"&&product.special_offer_text.toLowerCase()==="clearance";
    const kind=price===0.01?"penny":clearance?"clearance":original!==null?"sale":null;
    if(!kind)continue;
    let imageUrl:string|null=null;
    try{const u=new URL(product.thumbnail);if(u.protocol==="https:"&&u.hostname==="i5.walmartimages.com"&&!u.username&&!u.password)imageUrl=u.href;}catch{}
    deals.push({id,title:product.title.slice(0,400),price,originalPrice:original,
      savings:original===null?null:Math.round((original-price)*100)/100,kind,promotion:null,
      productUrl:`https://www.walmart.com/ip/${id}`,imageUrl,pickupText:null,quantity:null,pickupStatus:"unknown"});
  }
  const created=raw.search_metadata?.created_at;
  const parsed=typeof created==="string"&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/.test(created)?
    Date.parse(created.replace(" ","T").replace(" UTC","Z")):NaN;
  return {source:"serpapi-walmart",retailer:"Walmart",storeId:"3463",storeName:"Brandon",zip:"33511",query,
    fetchedAt:new Date().toISOString(),providerCreatedAt:Number.isFinite(parsed)?new Date(parsed).toISOString():null,
    deals,productsChecked:raw.organic_results.length,skippedProducts,hasMore:query.page<10&&!!raw.serpapi_pagination?.next,
    coverage:{completed:1,failed:0,total:1}};
}
export async function discoverWalmart(query:DiscoveryQuery,request:typeof requestSerpApi=requestSerpApi){
  if(query.zip!=="33511")throw new ConnectorError("DISCOVERY_LOCATION_UNSUPPORTED");
  const raw=await request({engine:"walmart",query:"clearance",store_id:"3463",page:String(query.page)});
  return normalizeWalmart(raw,query);
}
