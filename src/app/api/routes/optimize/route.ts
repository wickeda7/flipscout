import { NextResponse } from "next/server";

interface StoreInput {
  key: string;
  storeName: string;
  latitude: number;
  longitude: number;
}

interface OptimizeRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  stores: StoreInput[];
}

const METERS_PER_MILE = 1609.344;

export async function POST(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error:
          "MAPBOX_ACCESS_TOKEN is not configured. FlipScout will continue using its local route fallback.",
      },
      { status: 503 },
    );
  }

  let body: OptimizeRequest;

  try {
    body = (await request.json()) as OptimizeRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }

  const { origin, stores } = body;

  if (
    !origin ||
    !Number.isFinite(origin.latitude) ||
    !Number.isFinite(origin.longitude)
  ) {
    return NextResponse.json(
      { error: "A valid origin is required." },
      { status: 400 },
    );
  }

  if (!Array.isArray(stores) || stores.length === 0) {
    return NextResponse.json(
      { error: "Select at least one store." },
      { status: 400 },
    );
  }

  // Optimization API v1 accepts 2-12 coordinates total.
  // One coordinate is reserved for the trip origin.
  if (stores.length > 11) {
    return NextResponse.json(
      { error: "Live routing supports up to 11 stores per trip." },
      { status: 400 },
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
    return NextResponse.json(
      { error: "One or more stores have invalid coordinates." },
      { status: 400 },
    );
  }

  const coordinates = [
    `${origin.longitude},${origin.latitude}`,
    ...stores.map((store) => `${store.longitude},${store.latitude}`),
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

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || data.code !== "Ok" || !data.trips?.[0]) {
      return NextResponse.json(
        {
          error:
            data.message ??
            `Mapbox routing failed with status ${response.status}.`,
        },
        { status: response.ok ? 502 : response.status },
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

    const legs =
      trip.legs?.map(
        (
          leg: { distance?: number; duration?: number },
          index: number,
        ) => ({
          index,
          distanceMiles: (leg.distance ?? 0) / METERS_PER_MILE,
          durationMinutes: (leg.duration ?? 0) / 60,
        }),
      ) ?? [];

    return NextResponse.json({
      provider: "mapbox",
      orderedStoreKeys: orderedStores.map((store) => store.key),
      distanceMiles: trip.distance / METERS_PER_MILE,
      durationMinutes: trip.duration / 60,
      legs,
      geometry:
        trip.geometry?.type === "LineString"
          ? trip.geometry.coordinates
          : [],
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to reach the live routing provider. FlipScout can still use the local fallback route.",
      },
      { status: 502 },
    );
  }
}
