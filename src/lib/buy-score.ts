export interface BuyScoreInput {
  roiPercent: number;
  netProfit: number;
  discountPercent: number;
  inventory: number;
  distanceMiles: number;
}

export interface BuyScoreResult {
  score: number;
  label: "STRONG BUY" | "BUY" | "MAYBE" | "SKIP";
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
  const roiScore = clamp((roiPercent / 150) * 100);
  const profitScore = clamp((netProfit / 60) * 100);
  const discountScore = clamp(discountPercent);
  const inventoryScore = clamp((inventory / 8) * 100);
  const distanceScore = clamp(100 - distanceMiles * 4);

  const score = Math.round(
    roiScore * 0.30 +
      profitScore * 0.30 +
      discountScore * 0.15 +
      inventoryScore * 0.15 +
      distanceScore * 0.10,
  );

  const label =
    score >= 90
      ? "STRONG BUY"
      : score >= 80
        ? "BUY"
        : score >= 65
          ? "MAYBE"
          : "SKIP";

  return { score, label };
}
