import type { RetailerAvailabilityResponse } from "@flipscout/types";
import { RequestError } from "../security/request-error.js";

export function parseBestBuyQuery(params: URLSearchParams) {
  for (const key of params.keys()) if (!["zip", "sku"].includes(key) || params.getAll(key).length !== 1)
    throw new RequestError("Supply a five-digit ZIP code and numeric Best Buy SKU.",400,"INVALID_RETAILER_QUERY");
  const zip=params.get("zip") ?? "", sku=params.get("sku") ?? "";
  if (!/^\d{5}$/.test(zip) || !/^\d{1,16}$/.test(sku))
    throw new RequestError("Supply a five-digit ZIP code and numeric Best Buy SKU.",400,"INVALID_RETAILER_QUERY");
  return { zip, sku };
}
export class BestBuyClient {
  constructor(private readonly key: string | undefined = process.env.BESTBUY_API_KEY,
    private readonly fetcher: typeof fetch = fetch,
    private readonly sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve,ms)),
    private readonly timeoutMs = 15000) {}
  private async get(path: string, params: Record<string,string> = {}): Promise<any> {
    if (!this.key?.trim()) throw new RequestError("Retailer connection is not configured.",503,"RETAILER_NOT_CONFIGURED");
    const url=new URL(path,"https://api.bestbuy.com");
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    // The official API requires this query parameter. Never log the request URL.
    url.searchParams.set("apiKey",this.key);
    for (let attempt=0; attempt<3; attempt++) {
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
      let delay=250*2**attempt;
      try {
        const response=await this.fetcher(url,{headers:{Accept:"application/json"},redirect:"error",signal:controller.signal});
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status===404) throw new RequestError("Product not found.",404,"RETAILER_PRODUCT_NOT_FOUND");
          if ([401,403].includes(response.status)) throw new RequestError("Retailer access or quota needs attention.",503,"RETAILER_ACCESS_FAILED");
          if (response.status===429 || [500,502,503,504].includes(response.status)) {
            const after=response.headers.get("retry-after");
            if (after) {
              const ms=/^\d+$/.test(after) ? Number(after)*1000 : Date.parse(after)-Date.now();
              if (Number.isFinite(ms)) delay=Math.max(delay,ms);
            }
            if (attempt===2 || delay>30000) throw new RequestError("Retailer is temporarily unavailable.",503,"RETAILER_UNAVAILABLE");
          } else throw new RequestError("Retailer request failed.",502,"RETAILER_REQUEST_FAILED");
        } else {
          if (!/application\/(?:[a-z0-9.+-]*\+)?json\b/i.test(response.headers.get("content-type") ?? "") || !response.body)
            throw new RequestError("Invalid retailer response.",502,"RETAILER_INVALID_RESPONSE");
          const reader=response.body.getReader(); const chunks: Uint8Array[]=[]; let size=0;
          try {
            while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength;
              if(size>1000000) throw new RequestError("Retailer response is too large.",502,"RETAILER_INVALID_RESPONSE"); chunks.push(value); }
          } finally { await reader.cancel().catch(()=>undefined); }
          try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
          catch { throw new RequestError("Invalid retailer response.",502,"RETAILER_INVALID_RESPONSE"); }
        }
      } catch(error) {
        if(error instanceof RequestError) throw error;
        if(attempt===2) throw new RequestError("Retailer is temporarily unavailable.",503,"RETAILER_UNAVAILABLE");
      } finally { clearTimeout(timer); }
      await this.sleep(delay);
    }
    throw new RequestError("Retailer is temporarily unavailable.",503,"RETAILER_UNAVAILABLE");
  }
  async availability(zip: string, sku: string): Promise<RetailerAvailabilityResponse> {
    parseBestBuyQuery(new URLSearchParams({zip,sku}));
    const product=await this.get(`/v1/products/${sku}.json`,{show:"sku,name,regularPrice,salePrice"});
    const data=await this.get(`/v1/products/${sku}/stores.json`,{postalCode:zip});
    const invalid=(): never => { throw new RequestError("Invalid retailer response.",502,"RETAILER_INVALID_RESPONSE"); };
    const text=(v: unknown): v is string => typeof v==="string" && v.trim().length>0;
    const price=(v: unknown) => typeof v==="number" && Number.isFinite(v) && v>=0 ? v : null;
    if (!product || String(product.sku)!==sku || !text(product.name) || !data || !Array.isArray(data.stores) || data.stores.length>1000) return invalid();
    const seen=new Set<string>();
    const stores=data.stores.map((s:any) => {
      if (!s || ![s.storeID,s.name,s.city,s.state].every(text) || seen.has(s.storeID)) return invalid();
      seen.add(s.storeID);
      return { id:s.storeID as string, name:s.name as string, city:s.city as string, state:s.state as string,
        distanceMiles:price(s.distance), availability:"in-stock" as const, inventory:null,
        lowStock:typeof s.lowStock==="boolean" ? s.lowStock : null };
    });
    return { source:"bestbuy", observedAt:new Date().toISOString(), sku, productName:product.name,
      regularPrice:price(product.regularPrice), salePrice:price(product.salePrice), priceScope:"catalog", stores };
  }
}
