import type { RetailerIngestionBatch } from "@flipscout/types";
import { validateBatch } from "./validation.js";

/** Aggregate diagnostics only: never emit product payloads, source URLs or credentials. */
export function feedReport(batch: RetailerIngestionBatch, staleAfterMinutes = 180, now = Date.now()) {
  validateBatch(batch);
  if (!Number.isFinite(staleAfterMinutes) || staleAfterMinutes <= 0 || !Number.isFinite(now)) throw new Error("INVALID_REPORT_OPTIONS");
  let staleDeals = 0, futureDeals = 0, freshInStockDeals = 0, zeroInventoryDeals = 0;
  let oldest: number | null = null, newest: number | null = null;
  const coverage = { sku: 0, upc: 0, sourceUrl: 0, suppliedResalePrice: 0 };
  const storesWithDeals = new Set<string>();
  for (const d of batch.deals) {
    const time = Date.parse(d.sourceUpdatedAt);
    oldest = oldest === null ? time : Math.min(oldest, time);
    newest = newest === null ? time : Math.max(newest, time);
    const stale = time < now-staleAfterMinutes*60000;
    const future = time > now+5*60000;
    if (stale) staleDeals++;
    if (future) futureDeals++;
    if (!stale && !future && d.inventory > 0) freshInStockDeals++;
    if (d.inventory === 0) zeroInventoryDeals++;
    storesWithDeals.add(d.externalStoreId);
    if (d.sku) coverage.sku++;
    if (d.upc) coverage.upc++;
    if (d.sourceUrl) coverage.sourceUrl++;
    if (d.resalePrice !== undefined) coverage.suppliedResalePrice++;
  }
  const warnings: string[] = [];
  if (!batch.stores.length) warnings.push("NO_STORES");
  if (!batch.deals.length) warnings.push("NO_DEALS");
  if (staleDeals) warnings.push("STALE_INVENTORY");
  if (futureDeals) warnings.push("FUTURE_TIMESTAMPS");
  if (!freshInStockDeals) warnings.push("NO_FRESH_IN_STOCK_DEALS");
  if (batch.fullSnapshot) warnings.push("FULL_SNAPSHOT_CAN_DEACTIVATE_MISSING_DEALS");
  return { source: batch.source, status: futureDeals || !freshInStockDeals ? "needs-review" : "validated",
    generatedAt: new Date(now).toISOString(), fullSnapshot: batch.fullSnapshot, staleAfterMinutes,
    stores: batch.stores.length, deals: batch.deals.length, storesWithoutDeals: batch.stores.length-storesWithDeals.size,
    freshInStockDeals, staleDeals, futureDeals, zeroInventoryDeals,
    oldestInventoryAt: oldest === null ? null : new Date(oldest).toISOString(),
    newestInventoryAt: newest === null ? null : new Date(newest).toISOString(), coverage, warnings };
}
