import type { Deal } from "@/types/deal";
import { calculateBuyScore } from "@/lib/buy-score";
import { calculateMaximumPurchasePrice, calculateProfit } from "@/lib/profit";

export interface ResaleScenario {
  key: "conservative" | "expected" | "optimistic";
  resalePrice: number;
  netProfit: number;
  roiPercent: number;
}

export function analyzeDeal(deal: Deal) {
  const discountPercent =
    ((deal.retailPrice - deal.clearancePrice) / deal.retailPrice) * 100;

  const score = calculateBuyScore({
    roiPercent: deal.roi,
    netProfit: deal.estimatedProfit,
    discountPercent,
    inventory: deal.inventory,
    distanceMiles: deal.distanceMiles,
  });

  const maxPurchase = calculateMaximumPurchasePrice({
    resalePrice: deal.resalePrice,
    marketplaceFeePercent: deal.marketplaceFeePercent,
    shippingCost: deal.shippingCost,
    otherCosts: deal.otherCosts,
    targetProfit: 30,
    targetRoiPercent: 100,
  });

  const scenarios: ResaleScenario[] = [
    { key: "conservative" as const, multiplier: 0.85 },
    { key: "expected" as const, multiplier: 1 },
    { key: "optimistic" as const, multiplier: 1.15 },
  ].map(({ key, multiplier }) => {
    const resalePrice = deal.resalePrice * multiplier;
    const profit = calculateProfit({
      purchasePrice: deal.clearancePrice,
      resalePrice,
      marketplaceFeePercent: deal.marketplaceFeePercent,
      shippingCost: deal.shippingCost,
      otherCosts: deal.otherCosts,
    });

    return {
      key,
      resalePrice,
      netProfit: profit.netProfit,
      roiPercent: profit.roiPercent,
    };
  });

  const risks: Array<"thinMargin" | "longDistance" | "lowInventory" | "lowProfit" | "aboveTarget" | "none"> = [];
  if (deal.margin < 20) risks.push("thinMargin");
  if (deal.distanceMiles > 12) risks.push("longDistance");
  if (deal.inventory <= 2) risks.push("lowInventory");
  if (deal.estimatedProfit < 20) risks.push("lowProfit");
  if (deal.clearancePrice > maxPurchase.recommendedMaxPurchasePrice) {
    risks.push("aboveTarget");
  }
  if (risks.length === 0) risks.push("none");

  return { discountPercent, score, maxPurchase, scenarios, risks };
}
