import { distanceMiles } from "@flipscout/core";
import type { Deal, StoreSummary, StoreSearchResponse } from "@flipscout/types";
import { mockDeals } from "../mock-deals.js";
import { positiveIntegerEnv } from "../security/config.js";
import type { ResolvedStoreQuery } from "./query.js";
import type { StoreProvider } from "./store-provider.js";
export function mockStoreId(d: Deal) {
  return "mock-" + Buffer.from(JSON.stringify([d.retailer, d.storeName, d.city, d.state, d.latitude, d.longitude])).toString("base64url");
}
export class MockStoreProvider implements StoreProvider {
  constructor(private readonly deals: Deal[] = mockDeals) {}
  async search(q: ResolvedStoreQuery): Promise<StoreSearchResponse> {
    const stores = new Map<string, StoreSummary>();
    const threshold = positiveIntegerEnv("INGESTION_STALE_AFTER_MINUTES", 180);
    for (const d of this.deals) {
      const id = mockStoreId(d);
      const s = stores.get(id) ?? { id, source: "mock", retailer: d.retailer, storeName: d.storeName, city: d.city, state: d.state, latitude: d.latitude, longitude: d.longitude, distanceMiles: q.latitude === undefined ? null : distanceMiles({ latitude: q.latitude, longitude: q.longitude! }, d), activeDealCount: 0, unitCount: 0, totalPotentialProfit: 0, averageBuyScore: 0, strongBuyCount: 0 };
      if (d.isActive !== false && d.inventory > 0 && d.updatedMinutesAgo <= threshold) {
        s.activeDealCount++; s.unitCount += d.inventory; s.totalPotentialProfit += d.estimatedProfit * d.inventory;
        s.averageBuyScore += d.buyScore; if (d.buyScore >= 90) s.strongBuyCount++;
      }
      stores.set(id, s);
    }
    const all = [...stores.values()].filter(s =>
      (!q.q || [s.storeName, s.retailer, s.city, s.state].some(v => v.toLowerCase().includes(q.q!.toLowerCase()))) &&
      (!q.retailer || s.retailer.toLowerCase() === q.retailer.toLowerCase()) &&
      (!q.source || s.source === q.source) &&
      (q.radiusMiles === undefined || s.distanceMiles! <= q.radiusMiles));
    for (const s of all) s.averageBuyScore = s.activeDealCount ? s.averageBuyScore / s.activeDealCount : 0;
    all.sort((a, b) => (q.sort === "distance" ? a.distanceMiles! - b.distanceMiles! : 0) || a.storeName.localeCompare(b.storeName, "en") || a.id.localeCompare(b.id, "en"));
    return { stores: all.slice(q.offset, q.offset + q.limit), total: all.length, limit: q.limit, offset: q.offset, hasMore: q.offset + q.limit <= 10000 && q.offset + q.limit < all.length, dataProvider: "mock" };
  }
}
