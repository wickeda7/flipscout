export * from "./profit";
export * from "./buy-score";


export function estimateResalePrice(input: {
  retailPrice: number;
  clearancePrice: number;
  suppliedResalePrice?: number;
}): number {
  if (
    input.suppliedResalePrice !== undefined &&
    Number.isFinite(input.suppliedResalePrice) &&
    input.suppliedResalePrice > 0
  ) {
    return input.suppliedResalePrice;
  }

  // Phase 3 fallback until marketplace comps are connected.
  // Keep this deterministic and source-agnostic.
  const retailFloor = input.retailPrice * 0.68;
  const minimumMarkup = input.clearancePrice * 1.35;
  return Math.max(input.clearancePrice, retailFloor, minimumMarkup);
}

export { distanceMiles } from "./geo";
