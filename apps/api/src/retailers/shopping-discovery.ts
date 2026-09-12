import { discoveryRetailers, type DiscoveryQuery, type DiscoveryResponse, type DiscoveryRetailer, type DiscoveredDeal } from "@flipscout/types";
import { ConnectorError } from "../ingestion/http-config.js";
import { RequestError } from "../security/request-error.js";
import { requestSerpApi } from "./serpapi-request.js";
import { shoppingLocation } from "./shopping-location.js";

// Merchant names are exact matches after typography/case normalization. A retailer
// name in the query or product title is never evidence of who sells the offer.
export const shoppingMerchants = {
  lowes: { query: "Lowe's", names: ["Lowe's", "Lowes", "Lowes.com"], domain: "lowes.com" },
  target: { query: "Target", names: ["Target", "Target.com"], domain: "target.com" },
  "dollar-general": { query: "Dollar General", names: ["Dollar General", "DollarGeneral.com"], domain: "dollargeneral.com" },
  walgreens: { query: "Walgreens", names: ["Walgreens", "Walgreens.com"], domain: "walgreens.com" },
  cvs: { query: "CVS", names: ["CVS", "CVS Pharmacy", "CVS.com"], domain: "cvs.com" },
  costco: { query: "Costco", names: ["Costco", "Costco Wholesale", "Costco.com"], domain: "costco.com" },
  "sams-club": { query: "Sam's Club", names: ["Sam's Club", "SamsClub.com"], domain: "samsclub.com" },
  "best-buy": { query: "Best Buy", names: ["Best Buy", "BestBuy.com"], domain: "bestbuy.com" },
  "tractor-supply": { query: "Tractor Supply", names: ["Tractor Supply", "Tractor Supply Company", "Tractor Supply Co.", "TractorSupply.com"], domain: "tractorsupply.com" },
  "office-depot": { query: "Office Depot", names: ["Office Depot", "Office Depot OfficeMax", "Office Depot & OfficeMax", "OfficeDepot.com"], domain: "officedepot.com" },
} satisfies Partial<Record<DiscoveryRetailer, { query: string; names: string[]; domain: string }>>;
export type ShoppingRetailer = keyof typeof shoppingMerchants;
export function isShoppingRetailer(value: unknown): value is ShoppingRetailer {
  return typeof value === "string" && Object.hasOwn(shoppingMerchants, value);
}
export function shoppingParams(query: DiscoveryQuery): Record<string, string> {
  if (!isShoppingRetailer(query.retailer)) throw new RequestError("Unsupported retailer.", 400, "INVALID_DISCOVERY_QUERY");
  if (query.page !== 1 || query.category !== "all" || !/^\d{5}$/.test(query.zip ?? ""))
    throw new RequestError("Online offers support one combined page and a five-digit ZIP.", 400, "INVALID_DISCOVERY_QUERY");
  return { engine: "google_shopping", q: `${shoppingMerchants[query.retailer].query} clearance sale`,
    location: `${query.zip},United States`, gl: "us", hl: "en", google_domain: "google.com" };
}
const object = (value: unknown): value is Record<string, any> => value !== null && typeof value === "object" && !Array.isArray(value);
const merchantName = (value: string) => value.trim().replace(/[’‘]/g, "'").replace(/\s+/g, " ").toLowerCase();
function usd(display: unknown, extracted: unknown): number | null {
  if (typeof display !== "string" || !/^\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(display.trim()) ||
      typeof extracted !== "number" || !Number.isFinite(extracted) || extracted < 0) return null;
  const amount = Number(display.trim().slice(1).replaceAll(",", ""));
  return Math.abs(amount - extracted) < 0.000001 ? amount : null;
}
function safeUrl(value: unknown, allowed: (url: URL) => boolean): string | null {
  if (typeof value !== "string" || value.length > 12000) return null;
  try { const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && allowed(url) ? url.href : null;
  } catch { return null; }
}
const domainMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function normalizeShopping(raw: unknown, query: DiscoveryQuery, expectedLocation = shoppingParams(query).location): DiscoveryResponse {
  const expected = shoppingParams(query);
  if (!object(raw) || raw.error || raw.search_metadata?.status !== "Success") throw new ConnectorError("DISCOVERY_PROVIDER_FAILED");
  const params = raw.search_parameters;
  if (!object(params) || params.engine !== expected.engine || params.q !== expected.q || params.gl !== "us" || params.hl !== "en" ||
      (params.location_requested ?? params.location) !== expectedLocation)
    throw new ConnectorError("DISCOVERY_CONTEXT_MISMATCH");
  const groups = Array.isArray(raw.categorized_shopping_results) ? raw.categorized_shopping_results : [];
  if (!Array.isArray(raw.shopping_results) && !groups.some(g => Array.isArray(g?.shopping_results)))
    throw new ConnectorError("DISCOVERY_INVALID_RESPONSE");
  const products = [...(Array.isArray(raw.shopping_results) ? raw.shopping_results : []),
    ...groups.flatMap(g => Array.isArray(g?.shopping_results) ? g.shopping_results : [])];
  if (products.length > 2000) throw new ConnectorError("DISCOVERY_INVALID_RESPONSE");
  const retailer = query.retailer as ShoppingRetailer;
  const merchant = shoppingMerchants[retailer];
  const names = new Set(merchant.names.map(merchantName));
  const diagnostics = { merchantMatched: 0, wrongMerchant: 0, notDiscounted: 0, invalid: 0 };
  const deals: DiscoveredDeal[] = [], seen = new Set<string>();
  for (const p of products) {
    if (!object(p)) { diagnostics.invalid++; continue; }
    if (typeof p.source !== "string" || !names.has(merchantName(p.source))) { diagnostics.wrongMerchant++; continue; }
    diagnostics.merchantMatched++;
    const price = usd(p.price, p.extracted_price), id = String(p.product_id ?? "");
    // Shopping links are comparison pages, not proof of merchant checkout or store stock.
    const direct = safeUrl(p.link, u => domainMatches(u.hostname, merchant.domain));
    const comparison = safeUrl(p.product_link, u => u.hostname === "www.google.com" &&
      ((u.pathname === "/search" && u.searchParams.get("ibp") === "oshop") || /^\/shopping\/product\/\d+$/.test(u.pathname)));
    const productUrl = direct ?? comparison;
    if (price === null || (p.currency !== undefined && p.currency !== "USD") || !/^\d{1,30}$/.test(id) ||
        typeof p.title !== "string" || !p.title.trim() || !productUrl) { diagnostics.invalid++; continue; }
    const before = usd(typeof p.old_price === "string" ? p.old_price.replace(/^Was\s+/i, "") : p.old_price, p.extracted_old_price);
    const originalPrice = before !== null && before > price ? before : null;
    const clearance = typeof p.tag === "string" && p.tag.trim().toLowerCase() === "clearance";
    const kind = price === 0.01 ? "penny" : clearance ? "clearance" : originalPrice !== null ? "sale" : null;
    if (!kind) { diagnostics.notDiscounted++; continue; }
    if (seen.has(id)) continue;
    seen.add(id);
    const imageUrl = safeUrl(p.thumbnail, u => /^encrypted-tbn\d+\.gstatic\.com$/.test(u.hostname) ||
      u.hostname === "serpapi.com" || domainMatches(u.hostname, merchant.domain));
    deals.push({ id, title: p.title.trim().slice(0, 400), price, originalPrice,
      savings: originalPrice === null ? null : Math.round((originalPrice - price) * 100) / 100,
      kind, promotion: null, productUrl, imageUrl, pickupText: null, quantity: null, pickupStatus: "unknown" });
  }
  const created = raw.search_metadata?.created_at;
  const timestamp = typeof created === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/.test(created)
    ? Date.parse(created.replace(" ", "T").replace(" UTC", "Z")) : NaN;
  return { source: "serpapi-google-shopping", retailer: discoveryRetailers.find(r => r.id === retailer)!.name,
    storeId: null, storeName: null, zip: query.zip!, offerScope: "online", query, fetchedAt: new Date().toISOString(),
    providerCreatedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    deals, diagnostics, productsChecked: products.length, skippedProducts: diagnostics.invalid,
    // SerpApi documents that Google Shopping ignores offset pagination currently.
    hasMore: false, coverage: { completed: 1, failed: 0, total: 1 } };
}
export async function discoverShopping(query: DiscoveryQuery, request: typeof requestSerpApi = requestSerpApi,
  resolveLocation: typeof shoppingLocation = shoppingLocation): Promise<DiscoveryResponse> {
  const params = shoppingParams(query);
  params.location = await resolveLocation(query.zip!);
  return normalizeShopping(await request(params), query, params.location);
}
