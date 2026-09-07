export interface BuyScoreInput {
  roiPercent: number;
  netProfit: number;
  discountPercent: number;
  inventory: number;
  distanceMiles: number;
}

export interface BuyScoreBreakdown {
  roi: number;
  profit: number;
  discount: number;
  inventory: number;
  distance: number;
}

export interface BuyScoreResult {
  score: number;
  label: "STRONG BUY" | "BUY" | "MAYBE" | "SKIP";
  breakdown: BuyScoreBreakdown;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function calculateBuyScore({
  roiPercent,
  netProfit,
  discountPercent,
  inventory,
  distanceMiles,
}: BuyScoreInput): BuyScoreResult {
  const breakdown: BuyScoreBreakdown = {
    roi: clamp((roiPercent / 150) * 100),
    profit: clamp((netProfit / 60) * 100),
    discount: clamp(discountPercent),
    inventory: clamp((inventory / 8) * 100),
    distance: clamp(100 - distanceMiles * 4),
  };

  const score = Math.round(
    breakdown.roi * 0.30 +
      breakdown.profit * 0.30 +
      breakdown.discount * 0.15 +
      breakdown.inventory * 0.15 +
      breakdown.distance * 0.10,
  );

  const label =
    score >= 90
      ? "STRONG BUY"
      : score >= 80
        ? "BUY"
        : score >= 65
          ? "MAYBE"
          : "SKIP";

  return { score, label, breakdown };
}
