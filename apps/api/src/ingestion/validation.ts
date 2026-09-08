import type { RetailerIngestionBatch } from "@flipscout/types";
import { ConnectorError } from "./http-config.js";
export function validateBatch(batch: RetailerIngestionBatch) {
  const fail = () => { throw new ConnectorError("INVALID_BATCH"); };
  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const number = (v: unknown, min: number, max = 9999999999) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (!text(batch.source) || !Number.isFinite(Date.parse(batch.fetchedAt))) fail();
  const stores = new Set<string>(); const deals = new Set<string>();
  for (const s of batch.stores) {
    if (s.source !== batch.source || ![s.externalStoreId, s.retailer, s.storeName, s.city, s.state].every(text) || !number(s.latitude, -90, 90) || !number(s.longitude, -180, 180) || stores.has(s.externalStoreId)) fail();
    stores.add(s.externalStoreId);
  }
  for (const d of batch.deals) {
    const key = JSON.stringify([d.externalStoreId, d.externalDealId]);
    if (d.source !== batch.source || ![d.externalDealId, d.externalStoreId, d.productName, d.brand, d.category].every(text) || !stores.has(d.externalStoreId) || deals.has(key)) fail();
    if (!number(d.retailPrice, 0.01) || !number(d.clearancePrice, 0) || !number(d.inventory, 0, 2147483647) || !Number.isInteger(d.inventory) || !Number.isFinite(Date.parse(d.sourceUpdatedAt))) fail();
    for (const v of [d.resalePrice, d.shippingCost, d.otherCosts]) if (v !== undefined && !number(v, 0)) fail();
    if (d.marketplaceFeePercent !== undefined && !number(d.marketplaceFeePercent, 0, 100)) fail();
    if (d.sourceUrl !== undefined) {
      try { const u = new URL(d.sourceUrl); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) fail(); } catch { fail(); }
    }
    deals.add(key);
  }
}
