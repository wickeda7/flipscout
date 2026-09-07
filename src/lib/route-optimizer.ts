import type { StoreOpportunity } from "@/lib/store-planning";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteAssumptions {
  mpg: number;
  gasPricePerGallon: number;
  roadDistanceMultiplier: number;
  origin: GeoPoint;
}

export interface RouteLeg {
  fromLabel: string;
  toLabel: string;
  straightLineMiles: number;
  estimatedRoadMiles: number;
}

export interface RoutePlan {
  orderedStops: StoreOpportunity[];
  legs: RouteLeg[];
  estimatedMiles: number;
  estimatedFuelCost: number;
  grossPotentialProfit: number;
  netTripProfit: number;
  profitPerTripMile: number;
}

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMiles(a: GeoPoint, b: GeoPoint) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_MILES *
    Math.asin(Math.min(1, Math.sqrt(h)))
  );
}

function storePoint(store: StoreOpportunity): GeoPoint {
  return {
    latitude: store.latitude,
    longitude: store.longitude,
  };
}

function nearestNeighborOrder(
  stores: StoreOpportunity[],
  origin: GeoPoint,
) {
  const remaining = [...stores];
  const ordered: StoreOpportunity[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const distance = haversineMiles(
        current,
        storePoint(remaining[index]),
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = storePoint(next);
  }

  return ordered;
}

export function optimizeRoute(
  stores: StoreOpportunity[],
  assumptions: RouteAssumptions,
): RoutePlan {
  if (stores.length === 0) {
    return {
      orderedStops: [],
      legs: [],
      estimatedMiles: 0,
      estimatedFuelCost: 0,
      grossPotentialProfit: 0,
      netTripProfit: 0,
      profitPerTripMile: 0,
    };
  }

  const multiplier = Math.max(1, assumptions.roadDistanceMultiplier);
  const orderedStops = nearestNeighborOrder(stores, assumptions.origin);
  const legs: RouteLeg[] = [];

  let currentPoint = assumptions.origin;
  let currentLabel = "Start";

  for (const stop of orderedStops) {
    const straightLineMiles = haversineMiles(
      currentPoint,
      storePoint(stop),
    );

    legs.push({
      fromLabel: currentLabel,
      toLabel: stop.storeName,
      straightLineMiles,
      estimatedRoadMiles: straightLineMiles * multiplier,
    });

    currentPoint = storePoint(stop);
    currentLabel = stop.storeName;
  }

  const returnStraightLineMiles = haversineMiles(
    currentPoint,
    assumptions.origin,
  );

  legs.push({
    fromLabel: currentLabel,
    toLabel: "Start",
    straightLineMiles: returnStraightLineMiles,
    estimatedRoadMiles: returnStraightLineMiles * multiplier,
  });

  const estimatedMiles = legs.reduce(
    (sum, leg) => sum + leg.estimatedRoadMiles,
    0,
  );

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
    legs,
    estimatedMiles,
    estimatedFuelCost,
    grossPotentialProfit,
    netTripProfit,
    profitPerTripMile:
      estimatedMiles > 0 ? netTripProfit / estimatedMiles : 0,
  };
}
