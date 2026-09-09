import type { Deal } from "@flipscout/types";
import { mockDeals } from "../mock-deals.js";
import type { DealProvider, DealQuery } from "./deal-provider.js";

function includes(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

export class MockDealProvider implements DealProvider {
  async listDeals(query: DealQuery = {}): Promise<Deal[]> {
    const { q, retailer, category } = query;

    return mockDeals.filter((deal) => {
      if (
        q &&
        ![
          deal.productName,
          deal.brand,
          deal.retailer,
          deal.storeName,
          deal.category,
          deal.city,
          deal.state,
        ].some((value) => includes(value, q))
      ) {
        return false;
      }

      if (retailer && deal.retailer !== retailer) return false;
      if (category && deal.category !== category) return false;

      return true;
    });
  }

  async getDeal(id: string): Promise<Deal | null> {
    return mockDeals.find((deal) => deal.id === id) ?? null;
  }

  async health() {
    return { ok: true, detail: "mock" };
  }
}
