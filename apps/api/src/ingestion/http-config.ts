import { readFileSync } from "node:fs";
import type { RetailerSource } from "@flipscout/types";

export class ConnectorError extends Error {
  constructor(public readonly code: string) { super(code); }
}
export type Mapping = { path?: string; value?: string | number; type: "string" | "number" | "date"; scale?: number };
export type Endpoint = {
  url: string;
  itemsPath: string;
  mapping: Record<string, Mapping>;
  pagination: { mode: "none" | "page" | "cursor"; param?: string; sizeParam?: string; pageSize?: number; start?: number; nextPath?: string };
};
export type HttpSourceConfig = {
  source: RetailerSource; enabled: boolean; fullSnapshot: boolean; allowEmptySnapshot: boolean;
  intervalMinutes: number; timeoutMs: number; retries: number; maxPages: number; maxRecords: number; maxResponseBytes: number;
  auth?: { header: string; env: string; prefix?: string };
  stores: Endpoint; deals: Endpoint;
};
const storeFields = ["externalStoreId", "retailer", "storeName", "city", "state", "latitude", "longitude"];
const dealFields = ["externalDealId", "externalStoreId", "productName", "brand", "category", "retailPrice", "clearancePrice", "inventory", "sourceUpdatedAt"];
const optionalFields = ["resalePrice", "marketplaceFeePercent", "shippingCost", "otherCosts", "sourceUrl", "sku", "upc"];
const numericFields = new Set(["latitude", "longitude", "retailPrice", "clearancePrice", "inventory", "resalePrice", "marketplaceFeePercent", "shippingCost", "otherCosts"]);
function check(ok: unknown): asserts ok { if (!ok) throw new ConnectorError("INVALID_SOURCE_CONFIG"); }
function object(v: unknown): v is Record<string, any> { return !!v && typeof v === "object" && !Array.isArray(v); }
export function readPath(v: unknown, path: string): unknown {
  if (path === "") return v;
  return path.split(".").reduce<unknown>((a, k) => a !== null && typeof a === "object" && Object.hasOwn(a, k) ? (a as Record<string, unknown>)[k] : undefined, v);
}
export function parseConfig(input: unknown): HttpSourceConfig {
  check(object(input));
  const c = structuredClone(input);
  check(typeof c.source === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(c.source) && c.source !== "mock");
  for (const key of ["enabled", "fullSnapshot", "allowEmptySnapshot"]) { c[key] ??= false; check(typeof c[key] === "boolean"); }
  for (const [key, value, min, max] of [["intervalMinutes",60,1,10080], ["timeoutMs",15000,1,120000], ["retries",3,0,5], ["maxPages",100,1,1000], ["maxRecords",100000,1,1000000], ["maxResponseBytes",5000000,1,20000000]] as const) {
    c[key] ??= value; check(Number.isInteger(c[key]) && c[key] >= min && c[key] <= max);
  }
  if (c.auth !== undefined) {
    check(object(c.auth) && typeof c.auth.header === "string" && /^[A-Za-z0-9-]+$/.test(c.auth.header));
    check(!["host", "content-length", "connection", "transfer-encoding"].includes(c.auth.header.toLowerCase()));
    check(typeof c.auth.env === "string" && /^[A-Z][A-Z0-9_]*$/.test(c.auth.env));
    check(c.auth.prefix === undefined || (typeof c.auth.prefix === "string" && !/[\r\n]/.test(c.auth.prefix)));
  }
  for (const [kind, required, allowed] of [["stores", storeFields, storeFields], ["deals", dealFields, [...dealFields, ...optionalFields]]] as const) {
    const e = c[kind]; check(object(e));
    let url: URL; try { url = new URL(e.url); } catch { throw new ConnectorError("INVALID_SOURCE_CONFIG"); }
    check(url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)));
    check(!url.username && !url.password && !url.hash);
    check(typeof e.itemsPath === "string" && object(e.mapping));
    check(required.every(k => Object.hasOwn(e.mapping, k)));
    for (const [k, m] of Object.entries(e.mapping)) {
      check(allowed.includes(k) && object(m));
      check((typeof m.path === "string") !== Object.hasOwn(m, "value"));
      check(m.path !== undefined || ["string", "number"].includes(typeof m.value));
      check(m.type === (numericFields.has(k) ? "number" : k === "sourceUpdatedAt" ? "date" : "string"));
      check(m.scale === undefined || (m.type === "number" && Number.isFinite(m.scale) && m.scale > 0));
    }
    const p = e.pagination; check(object(p) && ["none", "page", "cursor"].includes(p.mode));
    if (p.mode !== "none") check(typeof p.param === "string" && /^[A-Za-z][A-Za-z0-9_]*$/.test(p.param));
    if (p.mode === "page") {
      check(Number.isInteger(p.pageSize) && p.pageSize > 0 && p.pageSize <= 10000);
      check(typeof p.sizeParam === "string" && /^[A-Za-z][A-Za-z0-9_]*$/.test(p.sizeParam) && p.sizeParam !== p.param);
      p.start ??= 1; check(Number.isInteger(p.start) && p.start >= 0);
    }
    if (p.mode === "cursor") check(typeof p.nextPath === "string" && p.nextPath.length > 0);
  }
  return c as HttpSourceConfig;
}
export function loadSources(path = process.env.RETAILER_SOURCES_FILE ?? "config/retailer-sources.json"): HttpSourceConfig[] {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path, "utf8")); } catch { throw new ConnectorError("SOURCE_CONFIG_UNREADABLE"); }
  check(Array.isArray(raw));
  const configs = raw.map(parseConfig);
  check(new Set(configs.map(c => c.source)).size === configs.length);
  return configs;
}
export function readiness(c: HttpSourceConfig, env = process.env): string {
  if (!c.enabled) return "disabled";
  if (c.auth && !env[c.auth.env]?.trim()) return "missing-credential";
  return "ready";
}
