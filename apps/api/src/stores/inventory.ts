import type { InventorySort, StoreInventoryResponse } from "@flipscout/types";
import type { DealProvider } from "../providers/deal-provider.js";
import { RequestError } from "../security/request-error.js";
import type { StoreProvider } from "./store-provider.js";
import { parseStoreQuery } from "./query.js";
export async function storeInventory(id: string, params: URLSearchParams, stores: StoreProvider, deals: DealProvider): Promise<StoreInventoryResponse> {
  if (!id || id.length > 1024 || /[\u0000-\u001f\u007f]/.test(id)) throw new RequestError("Invalid store ID.", 400, "INVALID_STORE_ID");
  for (const key of params.keys()) {
    if (!["lat", "lng", "limit", "offset", "q", "category", "sort"].includes(key) || params.getAll(key).length !== 1)
      throw new RequestError("Invalid inventory query.", 400, "INVALID_STORE_QUERY");
  }
  const sort = params.get("sort") ?? "buy-score";
  if (!["buy-score", "profit", "price-asc", "price-desc"].includes(sort))
    throw new RequestError("Invalid inventory sort.", 400, "INVALID_STORE_QUERY");
  const category = params.get("category")?.trim() || undefined;
  if (category && (category.length > 80 || /[\u0000-\u001f\u007f]/.test(category)))
    throw new RequestError("Invalid category.", 400, "INVALID_STORE_QUERY");
  const base = new URLSearchParams(params);
  base.delete("category"); base.delete("sort");
  const q = parseStoreQuery(base);
  const catalog = await stores.search({ latitude: q.latitude, longitude: q.longitude, storeId: id, limit: 1, offset: 0, sort: "name" });
  const store = catalog.stores[0];
  if (!store) throw new RequestError("Store not found.", 404, "STORE_NOT_FOUND");
  const rows = await deals.listDeals({ q: q.q, category, inventorySort: sort as InventorySort, storeId: id, originLatitude: q.latitude, originLongitude: q.longitude, limit: q.limit + 1, offset: q.offset });
  return { store, deals: rows.slice(0, q.limit), limit: q.limit, offset: q.offset, hasMore: rows.length > q.limit && q.offset + q.limit <= 10000 };
}
