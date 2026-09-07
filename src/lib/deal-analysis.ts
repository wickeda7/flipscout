import type { Deal } from "@/types/deal";
import { calculateBuyScore } from "@/lib/buy-score";
import { calculateMaximumPurchasePrice, calculateProfit } from "@/lib/profit";

export interface ResaleScenario {
  label: string;
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
    { label: "Conservative", multiplier: 0.85 },
    { label: "Expected", multiplier: 1 },
    { label: "Optimistic", multiplier: 1.15 },
  ].map(({ label, multiplier }) => {
    const resalePrice = deal.resalePrice * multiplier;
    const profit = calculateProfit({
      purchasePrice: deal.clearancePrice,
      resalePrice,
      marketplaceFeePercent: deal.marketplaceFeePercent,
      shippingCost: deal.shippingCost,
      otherCosts: deal.otherCosts,
    });

    return {
      label,
      resalePrice,
      netProfit: profit.netProfit,
      roiPercent: profit.roiPercent,
    };
  });

  const risks: string[] = [];
  if (deal.margin < 20) risks.push("Thin profit margin leaves little room for price drops or returns.");
  if (deal.distanceMiles > 12) risks.push("Longer pickup distance reduces profit per trip.");
  if (deal.inventory <= 2) risks.push("Low reported inventory increases the chance the item is gone before arrival.");
  if (deal.estimatedProfit < 20) risks.push("Expected dollar profit is relatively low.");
  if (deal.clearancePrice > maxPurchase.recommendedMaxPurchasePrice) {
    risks.push("Current purchase price is above the default $30 profit / 100% ROI target.");
  }
  if (risks.length === 0) risks.push("No major risk flags based on the current planning assumptions.");

  return { discountPercent, score, maxPurchase, scenarios, risks };
}
