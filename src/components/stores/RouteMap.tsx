"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreOpportunity } from "@/lib/store-planning";

interface RouteMapProps {
  stores: StoreOpportunity[];
  origin: {
    latitude: number;
    longitude: number;
  };
  geometry?: [number, number][];
}

type MapboxModule = typeof import("mapbox-gl");

export function RouteMap({
  stores,
  origin,
  geometry,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return;

    let disposed = false;

    async function initializeMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")) as MapboxModule;

        if (disposed || !containerRef.current) return;

        const map = new mapboxgl.Map({
          accessToken: token,
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [-81.32, 28.76],
          zoom: 10,
          attributionControl: true,
        });

        map.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          "top-right",
        );

        map.on("load", () => {
          if (disposed) return;

          map.addSource("flipscout-route", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          });

          map.addLayer({
            id: "flipscout-route-glow",
            type: "line",
            source: "flipscout-route",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#10b981",
              "line-width": 9,
              "line-opacity": 0.18,
            },
          });

          map.addLayer({
            id: "flipscout-route-line",
            type: "line",
            source: "flipscout-route",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#34d399",
              "line-width": 4,
              "line-opacity": 0.95,
            },
          });

          setMapError("");
          setMapReady(true);
        });

        map.on("error", (event) => {
          setMapError(
            event.error?.message ??
              "Mapbox could not render the route preview.",
          );
        });

        mapRef.current = map;
      } catch (error) {
        setMapError(
          error instanceof Error
            ? error.message
            : "Unable to initialize Mapbox.",
        );
      }
    }

    initializeMap();

    return () => {
      disposed = true;
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !mapReady || !mapRef.current) return;

    let disposed = false;

    async function updateMap() {
      const mapboxgl = (await import("mapbox-gl")) as MapboxModule;
      const map = mapRef.current;

      if (!map || disposed) return;

      const source = map.getSource(
        "flipscout-route",
      ) as import("mapbox-gl").GeoJSONSource | undefined;

      source?.setData(routeGeoJson(stores, origin, geometry));

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      addMarkers(
        mapboxgl,
        map,
        stores,
        origin,
        markersRef,
      );

      fitRoute(mapboxgl, map, stores, origin, geometry);
      window.setTimeout(() => map.resize(), 0);
    }

    updateMap();

    return () => {
      disposed = true;
    };
  }, [
    token,
    mapReady,
    stores,
    origin.latitude,
    origin.longitude,
    geometry,
  ]);

  if (!token) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
        <Header live={Boolean(geometry?.length)} />
        <div className="flex h-[430px] items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="text-base font-semibold text-white">
              Mapbox map token required
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Add{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-neutral-300">
                NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
              </code>{" "}
              to <code className="text-neutral-300">.env.local</code>, then
              restart the Next.js dev server.
            </p>
            <p className="mt-3 text-xs leading-5 text-neutral-600">
              The server-side{" "}
              <code className="text-neutral-400">
                MAPBOX_ACCESS_TOKEN
              </code>{" "}
              remains separate and is used by the routing endpoint.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
      <Header live={Boolean(geometry?.length)} />

      <div className="relative">
        <div
          ref={containerRef}
          className="h-[430px] w-full bg-neutral-900"
          aria-label="Interactive Mapbox route map"
        />

        {!mapReady && !mapError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-950/40 text-sm text-neutral-500">
            Loading Mapbox…
          </div>
        )}

        {mapError && (
          <div className="absolute inset-x-4 bottom-4 rounded-xl border border-amber-500/20 bg-neutral-950/95 p-3 text-xs leading-5 text-amber-200 shadow-xl">
            {mapError}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ live }: { live: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        Route preview
      </div>
      <div className="text-xs text-neutral-600">
        {live ? "Mapbox live road route" : "Mapbox estimated route"}
      </div>
    </div>
  );
}

function routeGeoJson(
  stores: StoreOpportunity[],
  origin: { latitude: number; longitude: number },
  geometry?: [number, number][],
) {
  const coordinates =
    geometry && geometry.length > 1
      ? geometry
      : [
          [origin.longitude, origin.latitude] as [number, number],
          ...stores.map(
            (store) =>
              [store.longitude, store.latitude] as [number, number],
          ),
          [origin.longitude, origin.latitude] as [number, number],
        ];

  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
}

function addMarkers(
  mapboxgl: MapboxModule,
  map: import("mapbox-gl").Map,
  stores: StoreOpportunity[],
  origin: { latitude: number; longitude: number },
  markerRef: { current: import("mapbox-gl").Marker[] },
) {
  const startEl = document.createElement("div");
  startEl.className =
    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-950 text-[10px] font-bold text-white shadow-lg";
  startEl.textContent = "S";

  markerRef.current.push(
    new mapboxgl.Marker({
      element: startEl,
      anchor: "center",
    })
      .setLngLat([origin.longitude, origin.latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 20 }).setHTML(
          "<strong>Trip start</strong>",
        ),
      )
      .addTo(map),
  );

  stores.forEach((store, index) => {
    const markerEl = document.createElement("div");
    markerEl.className =
      "flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-400 text-xs font-bold text-black shadow-lg";
    markerEl.textContent = String(index + 1);

    markerRef.current.push(
      new mapboxgl.Marker({
        element: markerEl,
        anchor: "center",
      })
        .setLngLat([store.longitude, store.latitude])
        .setPopup(
          new mapboxgl.Popup({
            offset: 20,
            closeButton: false,
          }).setHTML(
            `<div style="min-width:180px">` +
              `<strong>${escapeHtml(store.storeName)}</strong><br/>` +
              `${escapeHtml(store.city)}, ${escapeHtml(store.state)}<br/>` +
              `$${store.totalPotentialProfit.toFixed(0)} potential profit` +
              `</div>`,
          ),
        )
        .addTo(map),
    );
  });
}

function fitRoute(
  mapboxgl: MapboxModule,
  map: import("mapbox-gl").Map,
  stores: StoreOpportunity[],
  origin: { latitude: number; longitude: number },
  geometry?: [number, number][],
) {
  const points =
    geometry && geometry.length > 1
      ? geometry
      : [
          [origin.longitude, origin.latitude] as [number, number],
          ...stores.map(
            (store) =>
              [store.longitude, store.latitude] as [number, number],
          ),
        ];

  if (points.length === 0) return;

  const bounds = new mapboxgl.LngLatBounds(points[0], points[0]);

  points.slice(1).forEach((point) => {
    bounds.extend(point);
  });

  map.fitBounds(bounds, {
    padding: 55,
    maxZoom: 13,
    duration: 650,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
