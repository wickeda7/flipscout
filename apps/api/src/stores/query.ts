import type { StoreSearchQuery } from "@flipscout/types";
import { RequestError } from "../security/request-error.js";
export type ResolvedStoreQuery = StoreSearchQuery & { storeId?: string; limit: number; offset: number; sort: "name" | "distance" };
const invalid = () => { throw new RequestError("Invalid store search parameters.", 400, "INVALID_STORE_QUERY"); };
function numeric(params: URLSearchParams, key: string, min: number, max: number): number | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return invalid();
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return invalid();
  return value;
}
export function parseOrigin(params: URLSearchParams) {
  const latitude = numeric(params, "lat", -90, 90);
  const longitude = numeric(params, "lng", -180, 180);
  if ((latitude === undefined) !== (longitude === undefined)) invalid();
  return { latitude, longitude };
}
export function parseStoreQuery(params: URLSearchParams): ResolvedStoreQuery {
  const allowed = ["q", "retailer", "source", "lat", "lng", "radiusMiles", "sort", "limit", "offset"];
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) invalid();
  const origin = parseOrigin(params);
  const radiusMiles = numeric(params, "radiusMiles", 0.1, 500);
  const limit = numeric(params, "limit", 1, 100) ?? 12;
  const offset = numeric(params, "offset", 0, 10000) ?? 0;
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) invalid();
  const sort = params.get("sort") ?? (origin.latitude === undefined ? "name" : "distance");
  if (sort !== "name" && sort !== "distance") invalid();
  if (origin.latitude === undefined && (radiusMiles !== undefined || sort === "distance")) invalid();
  const text = (key: string, max: number) => {
    const value = params.get(key)?.trim();
    if (value && (value.length > max || /[\u0000-\u001f\u007f]/.test(value))) invalid();
    return value || undefined;
  };
  return { ...origin, radiusMiles, limit, offset, sort: sort as "name" | "distance", q: text("q", 120), retailer: text("retailer", 80), source: text("source", 64) };
}
