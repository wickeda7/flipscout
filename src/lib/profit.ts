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

  const roiPercent =
    purchasePrice > 0 ? (netProfit / purchasePrice) * 100 : 0;

  const marginPercent =
    resalePrice > 0 ? (netProfit / resalePrice) * 100 : 0;

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
