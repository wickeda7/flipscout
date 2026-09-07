"use client";

import { useEffect, useRef } from "react";
import type { StoreOpportunity } from "@/lib/store-planning";

interface RouteMapProps {
  stores: StoreOpportunity[];
  origin: {
    latitude: number;
    longitude: number;
  };
  geometry?: [number, number][];
}

export function RouteMap({
  stores,
  origin,
  geometry,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let map: import("leaflet").Map | undefined;

    async function renderMap() {
      const L = await import("leaflet");

      if (disposed || !containerRef.current) return;

      // Protect against React Strict Mode / hot reload re-initializing Leaflet.
      const container = containerRef.current as HTMLDivElement & {
        _leaflet_id?: number;
      };

      if (container._leaflet_id) {
        container._leaflet_id = undefined;
        container.innerHTML = "";
      }

      map = L.map(container, {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const originLatLng = L.latLng(origin.latitude, origin.longitude);

      L.circleMarker(originLatLng, {
        radius: 9,
        weight: 3,
        color: "#ffffff",
        fillColor: "#0a0a0a",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Start", {
          permanent: true,
          direction: "top",
          offset: [0, -8],
        });

      stores.forEach((store, index) => {
        L.circleMarker([store.latitude, store.longitude], {
          radius: 9,
          weight: 2,
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 1,
        })
          .addTo(map!)
          .bindTooltip(`${index + 1}. ${store.storeName}`, {
            permanent: false,
            direction: "top",
          })
          .bindPopup(
            `<strong>${index + 1}. ${store.storeName}</strong><br/>` +
              `${store.city}, ${store.state}<br/>` +
              `$${store.totalPotentialProfit.toFixed(0)} potential profit`,
          );
      });

      const routeLatLngs: import("leaflet").LatLngExpression[] =
        geometry && geometry.length > 1
          ? geometry.map(([longitude, latitude]) => [
              latitude,
              longitude,
            ])
          : [
              [origin.latitude, origin.longitude],
              ...stores.map(
                (store) =>
                  [store.latitude, store.longitude] as [number, number],
              ),
              [origin.latitude, origin.longitude],
            ];

      if (routeLatLngs.length > 1) {
        L.polyline(routeLatLngs, {
          color: "#10b981",
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
      }

      const bounds = L.latLngBounds([
        originLatLng,
        ...stores.map((store) =>
          L.latLng(store.latitude, store.longitude),
        ),
      ]);

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.22), {
          maxZoom: 13,
        });
      } else {
        map.setView(originLatLng, 11);
      }

      // Leaflet can initialize before the responsive container has its final
      // dimensions. Recalculate once layout has settled.
      window.setTimeout(() => map?.invalidateSize(), 0);
    }

    renderMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [
    geometry,
    origin.latitude,
    origin.longitude,
    stores,
  ]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Route preview
        </div>
        <div className="text-xs text-neutral-600">
          {geometry?.length ? "Live road route" : "Estimated route"}
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[430px] w-full bg-neutral-900"
        aria-label="Interactive route map"
      />
    </div>
  );
}
