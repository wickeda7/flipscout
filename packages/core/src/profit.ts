export interface ProfitInput {
  purchasePrice: number;
  resalePrice: number;
  marketplaceFeePercent?: number;
  marketplaceFeeFlat?: number;
  shippingCost?: number;
  otherCosts?: number;
}

export interface ProfitResult {
  marketplaceFees: number;
  totalCosts: number;
  netProfit: number;
  roiPercent: number;
  marginPercent: number;
  breakEvenPrice: number;
}

export interface MaximumPurchaseInput {
  resalePrice: number;
  marketplaceFeePercent?: number;
  marketplaceFeeFlat?: number;
  shippingCost?: number;
  otherCosts?: number;
  targetProfit?: number;
  targetRoiPercent?: number;
}

export interface MaximumPurchaseResult {
  byProfitTarget: number;
  byRoiTarget: number;
  recommendedMaxPurchasePrice: number;
}

export function calculateProfit({
  purchasePrice,
  resalePrice,
  marketplaceFeePercent = 13.25,
  marketplaceFeeFlat = 0,
  shippingCost = 0,
  otherCosts = 0,
}: ProfitInput): ProfitResult {
  const marketplaceFees =
    resalePrice * (marketplaceFeePercent / 100) + marketplaceFeeFlat;

  const totalCosts =
    purchasePrice + marketplaceFees + shippingCost + otherCosts;

  const netProfit = resalePrice - totalCosts;
  const roiPercent = purchasePrice > 0 ? (netProfit / purchasePrice) * 100 : 0;
  const marginPercent = resalePrice > 0 ? (netProfit / resalePrice) * 100 : 0;

  const feeRate = marketplaceFeePercent / 100;
  const breakEvenPrice =
    1 - feeRate > 0
      ? (purchasePrice + shippingCost + otherCosts + marketplaceFeeFlat) /
        (1 - feeRate)
      : 0;

  return {
    marketplaceFees,
    totalCosts,
    netProfit,
    roiPercent,
    marginPercent,
    breakEvenPrice,
  };
}

export function calculateMaximumPurchasePrice({
  resalePrice,
  marketplaceFeePercent = 13.25,
  marketplaceFeeFlat = 0,
  shippingCost = 0,
  otherCosts = 0,
  targetProfit = 30,
  targetRoiPercent = 100,
}: MaximumPurchaseInput): MaximumPurchaseResult {
  const marketplaceFees =
    resalePrice * (marketplaceFeePercent / 100) + marketplaceFeeFlat;

  const proceedsAfterSellingCosts =
    resalePrice - marketplaceFees - shippingCost - otherCosts;

  const byProfitTarget = Math.max(0, proceedsAfterSellingCosts - targetProfit);

  const roiMultiplier = 1 + Math.max(0, targetRoiPercent) / 100;
  const byRoiTarget =
    roiMultiplier > 0
      ? Math.max(0, proceedsAfterSellingCosts / roiMultiplier)
      : 0;

  return {
    byProfitTarget,
    byRoiTarget,
    recommendedMaxPurchasePrice: Math.max(
      0,
      Math.min(byProfitTarget, byRoiTarget),
    ),
  };
}
