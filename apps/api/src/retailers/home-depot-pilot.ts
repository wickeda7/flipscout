import { ConnectorError } from "../ingestion/http-config.js";

export interface HomeDepotPilotQuery { productId: string; storeId: string; zip: string }
export function validatePilotQuery(q: HomeDepotPilotQuery) {
  if (!/^\d{9}$/.test(q.productId) || !/^\d{1,4}$/.test(q.storeId) || !/^\d{5}$/.test(q.zip))
    throw new ConnectorError("INVALID_PILOT_QUERY");
}
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === "object" && !Array.isArray(v);
const numeric = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
const identifier = (v: unknown): string | null => typeof v === "string" && /^\d+$/.test(v) ? v : null;
export function normalizeHomeDepotPilot(raw: unknown, q: HomeDepotPilotQuery, fetchedAt = new Date().toISOString()) {
  validatePilotQuery(q);
  if (!object(raw)) throw new ConnectorError("INVALID_PROVIDER_RESPONSE");
  if (raw.error || raw.search_metadata?.status !== "Success") throw new ConnectorError("PROVIDER_SEARCH_FAILED");
  const p = raw.product_results, params = raw.search_parameters;
  if (!object(p) || String(p.product_id) !== q.productId || typeof p.title !== "string" || !p.title.trim())
    throw new ConnectorError("PRODUCT_IDENTITY_MISMATCH");
  if (!object(params) || String(params.store_id) !== q.storeId || params.delivery_zip !== q.zip || String(params.product_id) !== q.productId)
    throw new ConnectorError("SEARCH_CONTEXT_MISMATCH");
  const options = Array.isArray(p.fulfillment?.options) ? p.fulfillment.options : [];
  const pickup = options.filter((o: unknown) => object(o) && o.type === "Store Pickup");
  const quantity = pickup.length === 1 ? numeric(pickup[0].quantity) : null;
  const stock = quantity !== null && Number.isInteger(quantity) ? quantity : null;
  const price = numeric(p.price);
  // Provider processing time is not an independently verified retailer inventory timestamp.
  const created = raw.search_metadata?.created_at;
  const parsed = typeof created === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/.test(created)
    ? Date.parse(created.replace(" ","T").replace(" UTC","Z")) : NaN;
  return { source: "serpapi-home-depot", ...q, fetchedAt,
    providerCreatedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null,
    retailerObservedAt: null, productName: p.title, sku: identifier(p.store_sku_number), upc: identifier(p.upc),
    reportedPrice: price, priceScope: "store-context-request-unverified", pickupQuantity: stock,
    reportedFulfillmentStore: typeof p.fulfillment?.store === "string" ? p.fulfillment.store : null,
    availability: stock === null ? "unknown" : stock > 0 ? "reported-pickup-stock" : "reported-zero-pickup-stock",
    pennyCandidate: price === 0.01, clearanceVerified: false,
    warnings: ["LOCAL_PRICE_REQUIRES_VERIFICATION", "RETAILER_TIMESTAMP_UNAVAILABLE",
      ...(stock === null ? ["PICKUP_QUANTITY_UNAVAILABLE"] : []), ...(price === null ? ["PRICE_UNAVAILABLE"] : []),
      ...(price === 0.01 ? ["PENNY_PRICE_REQUIRES_REGISTER_VERIFICATION"] : [])] };
}

export async function fetchHomeDepotPilot(q: HomeDepotPilotQuery, key = process.env.SERPAPI_API_KEY,
  fetcher: typeof fetch = fetch, timeoutMs = 45000) {
  validatePilotQuery(q);
  if (!key?.trim()) throw new ConnectorError("SERPAPI_KEY_MISSING");
  const url = new URL("https://serpapi.com/search.json");
  for (const [k,v] of Object.entries({ engine: "home_depot_product", product_id: q.productId,
    store_id: q.storeId, delivery_zip: q.zip, api_key: key })) url.searchParams.set(k,v);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // One request per product: no automatic retry that could spend additional credits.
    const response = await fetcher(url,{headers:{Accept:"application/json"},redirect:"error",signal:controller.signal});
    if (!response.ok) { await response.body?.cancel(); throw new ConnectorError(`SERPAPI_HTTP_${response.status}`); }
    if (!/application\/(?:[a-z0-9.+-]*\+)?json\b/i.test(response.headers.get("content-type") ?? "") || !response.body)
      throw new ConnectorError("INVALID_PROVIDER_RESPONSE");
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const {done,value} = await reader.read(); if(done) break;
        size += value.byteLength; if(size > 2000000) throw new ConnectorError("PROVIDER_RESPONSE_TOO_LARGE"); chunks.push(value); }
    } finally { await reader.cancel().catch(() => undefined); }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new ConnectorError("INVALID_PROVIDER_JSON"); }
    return normalizeHomeDepotPilot(raw,q);
  } catch (e) {
    if (e instanceof ConnectorError) throw e;
    throw new ConnectorError(controller.signal.aborted ? "SERPAPI_TIMEOUT" : "SERPAPI_NETWORK_ERROR");
  } finally { clearTimeout(timer); }
}
