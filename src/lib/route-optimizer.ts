import type { StoreOpportunity } from "@/lib/store-planning";

export interface RouteAssumptions {
  mpg: number;
  gasPricePerGallon: number;
  detourMilesPerExtraStop: number;
}

export interface RoutePlan {
  orderedStops: StoreOpportunity[];
  estimatedMiles: number;
  estimatedFuelCost: number;
  grossPotentialProfit: number;
  netTripProfit: number;
  profitPerTripMile: number;
}

export function optimizeRoute(
  stores: StoreOpportunity[],
  assumptions: RouteAssumptions,
): RoutePlan {
  if (stores.length === 0) {
    return {
      orderedStops: [],
      estimatedMiles: 0,
      estimatedFuelCost: 0,
      grossPotentialProfit: 0,
      netTripProfit: 0,
      profitPerTripMile: 0,
    };
  }

  // With only each store's distance from the user (not coordinates), the MVP
  // uses an outward sweep: nearest to farthest, then estimates the return trip.
  const orderedStops = [...stores].sort(
    (a, b) => a.distanceMiles - b.distanceMiles,
  );

  const farthestDistance = Math.max(
    ...orderedStops.map((store) => store.distanceMiles),
  );
  const extraStops = Math.max(0, orderedStops.length - 1);

  const estimatedMiles =
    farthestDistance * 2 +
    extraStops * Math.max(0, assumptions.detourMilesPerExtraStop);

  const estimatedFuelCost =
    assumptions.mpg > 0
      ? (estimatedMiles / assumptions.mpg) *
        Math.max(0, assumptions.gasPricePerGallon)
      : 0;

  const grossPotentialProfit = orderedStops.reduce(
    (sum, store) => sum + store.totalPotentialProfit,
    0,
  );

  const netTripProfit = grossPotentialProfit - estimatedFuelCost;

  return {
    orderedStops,
    estimatedMiles,
    estimatedFuelCost,
    grossPotentialProfit,
    netTripProfit,
    profitPerTripMile:
      estimatedMiles > 0 ? netTripProfit / estimatedMiles : 0,
  };
}
