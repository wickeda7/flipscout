import type { Deal } from "@/types/deal";

export interface StoreOpportunity {
  key: string;
  storeName: string;
  retailer: string;
  city: string;
  state: string;
  distanceMiles: number;
  latitude: number;
  longitude: number;
  dealCount: number;
  unitCount: number;
  totalPotentialProfit: number;
  averageBuyScore: number;
  strongBuyCount: number;
  profitPerMile: number;
  deals: Deal[];
}

export function groupDealsByStore(deals: Deal[]): StoreOpportunity[] {
  const groups = new Map<string, Deal[]>();

  for (const deal of deals) {
    const key = `${deal.retailer}|${deal.storeName}|${deal.city}|${deal.state}`;
    const current = groups.get(key) ?? [];
    current.push(deal);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, storeDeals]) => {
      const first = storeDeals[0];
      const totalPotentialProfit = storeDeals.reduce(
        (sum, deal) => sum + deal.estimatedProfit * deal.inventory,
        0,
      );
      const unitCount = storeDeals.reduce(
        (sum, deal) => sum + deal.inventory,
        0,
      );
      const averageBuyScore =
        storeDeals.reduce((sum, deal) => sum + deal.buyScore, 0) /
        storeDeals.length;
      const strongBuyCount = storeDeals.filter(
        (deal) => deal.buyScore >= 90,
      ).length;
      const distanceMiles = Math.min(
        ...storeDeals.map((deal) => deal.distanceMiles),
      );

      return {
        key,
        storeName: first.storeName,
        retailer: first.retailer,
        city: first.city,
        state: first.state,
        distanceMiles,
        latitude: first.latitude,
        longitude: first.longitude,
        dealCount: storeDeals.length,
        unitCount,
        totalPotentialProfit,
        averageBuyScore,
        strongBuyCount,
        profitPerMile:
          distanceMiles > 0 ? totalPotentialProfit / distanceMiles : 0,
        deals: [...storeDeals].sort((a, b) => b.buyScore - a.buyScore),
      };
    })
    .sort((a, b) => b.profitPerMile - a.profitPerMile);
}
