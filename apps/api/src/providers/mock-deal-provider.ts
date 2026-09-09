import { distanceMiles } from "@flipscout/core";
import { mockStoreId } from "../stores/mock-store-provider.js";
import { positiveIntegerEnv } from "../security/config.js";
import type { Deal } from "@flipscout/types";
import { mockDeals } from "../mock-deals.js";
import type { DealProvider, DealQuery } from "./deal-provider.js";

function includes(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

export class MockDealProvider implements DealProvider {
  constructor(private readonly deals: Deal[] = mockDeals) {}
  async listDeals(query: DealQuery = {}): Promise<Deal[]> {
    const { q, retailer, category } = query;

    const result = this.deals.filter((deal) => {
      if (query.storeId && (mockStoreId(deal) !== query.storeId || deal.isActive === false || deal.inventory <= 0 || deal.updatedMinutesAgo > positiveIntegerEnv("INGESTION_STALE_AFTER_MINUTES", 180))) return false;
      if (query.source && query.source !== (deal.source ?? "mock")) return false;
      if (
        q &&
        !(query.storeId ? [deal.productName, deal.brand] : [
          deal.productName, deal.brand, deal.retailer, deal.storeName, deal.category, deal.city, deal.state,
        ]).some((value) => includes(value, q))
      ) {
        return false;
      }

      if (retailer && deal.retailer !== retailer) return false;
      if (category && (query.storeId ? deal.category.toLowerCase() !== category.toLowerCase() : deal.category !== category)) return false;

      return true;
    });
    if (query.storeId) result.sort((a, b) => {
      const primary = query.inventorySort === "price-asc" ? a.clearancePrice - b.clearancePrice
        : query.inventorySort === "price-desc" ? b.clearancePrice - a.clearancePrice
        : query.inventorySort === "profit" ? b.estimatedProfit - a.estimatedProfit
        : b.buyScore - a.buyScore || b.estimatedProfit - a.estimatedProfit;
      return primary || a.id.localeCompare(b.id);
    });
    const page = query.limit === undefined ? result : result.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit);
    return page.map(deal => query.originLatitude === undefined ? { ...deal } : { ...deal, distanceMiles: Number(distanceMiles({ latitude: query.originLatitude, longitude: query.originLongitude! }, deal).toFixed(1)) });
  }

  async getDeal(id: string): Promise<Deal | null> {
    return this.deals.find((deal) => deal.id === id) ?? null;
  }

  async health() {
    return { ok: true, detail: "mock" };
  }
}
