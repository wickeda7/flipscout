import type {
  OptimizeRouteRequest,
  OptimizeRouteResponse,
} from "@flipscout/types";

const METERS_PER_MILE = 1609.344;

export async function optimizeWithMapbox(
  body: OptimizeRouteRequest,
  token: string,
): Promise<OptimizeRouteResponse> {
  const { origin, stores } = body;

  if (
    !origin ||
    !Number.isFinite(origin.latitude) ||
    !Number.isFinite(origin.longitude)
  ) {
    throw new RouteError(400, "A valid origin is required.");
  }

  if (!Array.isArray(stores) || stores.length === 0) {
    throw new RouteError(400, "Select at least one store.");
  }

  if (stores.length > 11) {
    throw new RouteError(
      400,
      "Live routing supports up to 11 stores per trip.",
    );
  }

  const validStores = stores.every(
    (store) =>
      store &&
      typeof store.key === "string" &&
      typeof store.storeName === "string" &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude),
  );

  if (!validStores) {
    throw new RouteError(
      400,
      "One or more stores have invalid coordinates.",
    );
  }

  const coordinates = [
    `${origin.longitude},${origin.latitude}`,
    ...stores.map(
      (store) => `${store.longitude},${store.latitude}`,
    ),
  ].join(";");

  const url = new URL(
    `https://api.mapbox.com/optimized-trips/v1/mapbox/driving-traffic/${coordinates}`,
  );

  url.searchParams.set("source", "first");
  url.searchParams.set("roundtrip", "true");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");
  url.searchParams.set("access_token", token);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const data = await response.json() as any;

  if (!response.ok || data.code !== "Ok" || !data.trips?.[0]) {
    throw new RouteError(
      response.ok ? 502 : response.status,
      data.message ??
        `Mapbox routing failed with status ${response.status}.`,
    );
  }

  const trip = data.trips[0];

  const orderedStores = stores
    .map((store, storeIndex) => {
      const inputCoordinateIndex = storeIndex + 1;
      const waypoint = data.waypoints?.[inputCoordinateIndex];

      return {
        ...store,
        waypointIndex:
          typeof waypoint?.waypoint_index === "number"
            ? waypoint.waypoint_index
            : inputCoordinateIndex,
      };
    })
    .sort((a, b) => a.waypointIndex - b.waypointIndex);

  return {
    provider: "mapbox",
    orderedStoreKeys: orderedStores.map((store) => store.key),
    distanceMiles: trip.distance / METERS_PER_MILE,
    durationMinutes: trip.duration / 60,
    legs:
      trip.legs?.map(
        (
          leg: { distance?: number; duration?: number },
          index: number,
        ) => ({
          index,
          distanceMiles: (leg.distance ?? 0) / METERS_PER_MILE,
          durationMinutes: (leg.duration ?? 0) / 60,
        }),
      ) ?? [],
    geometry:
      trip.geometry?.type === "LineString"
        ? trip.geometry.coordinates
        : [],
  };
}

export class RouteError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
