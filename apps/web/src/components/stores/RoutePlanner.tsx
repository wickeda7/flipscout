"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Fuel,
  Loader2,
  MapPinned,
  Navigation,
  Route,
  Timer,
  WalletCards,
} from "lucide-react";
import type { StoreOpportunity } from "@/lib/store-planning";
import { RouteMap } from "@/components/stores/RouteMap";
import { optimizeRoute } from "@/lib/route-optimizer";
import { flipScoutApi } from "@/lib/api";
import { useI18n } from "@/components/i18n/I18nProvider";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

const DEFAULT_ORIGIN = {
  latitude: 28.7589,
  longitude: -81.3178,
};

interface LiveRouteResult {
  provider: "mapbox";
  orderedStoreKeys: string[];
  distanceMiles: number;
  durationMinutes: number;
  legs: Array<{
    index: number;
    distanceMiles: number;
    durationMinutes: number;
  }>;
  geometry: [number, number][];
}

export function RoutePlanner({ stores, initialOrigin }: { stores: StoreOpportunity[]; initialOrigin?: { latitude: number; longitude: number } }) {
  const { t } = useI18n();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    (initialOrigin ? stores : stores.slice(0, Math.min(3, stores.length))).map((store) => store.key),
  );
  const [mpg, setMpg] = useState(25);
  const [gasPrice, setGasPrice] = useState(3.5);
  const [roadMultiplier, setRoadMultiplier] = useState(1.2);
  const [originLatitude, setOriginLatitude] = useState(
    initialOrigin?.latitude ?? DEFAULT_ORIGIN.latitude,
  );
  const [originLongitude, setOriginLongitude] = useState(
    initialOrigin?.longitude ?? DEFAULT_ORIGIN.longitude,
  );
  const [liveRoute, setLiveRoute] = useState<LiveRouteResult | null>(null);
  const [liveError, setLiveError] = useState("");
  const [loadingLiveRoute, setLoadingLiveRoute] = useState(false);

  const selectedStores = useMemo(
    () => stores.filter((store) => selectedKeys.includes(store.key)),
    [stores, selectedKeys],
  );

  const fallbackPlan = useMemo(
    () =>
      optimizeRoute(selectedStores, {
        mpg,
        gasPricePerGallon: gasPrice,
        roadDistanceMultiplier: roadMultiplier,
        origin: {
          latitude: originLatitude,
          longitude: originLongitude,
        },
      }),
    [
      selectedStores,
      mpg,
      gasPrice,
      roadMultiplier,
      originLatitude,
      originLongitude,
    ],
  );

  const orderedStores = useMemo(() => {
    if (!liveRoute) return fallbackPlan.orderedStops;

    const lookup = new Map(stores.map((store) => [store.key, store]));
    return liveRoute.orderedStoreKeys
      .map((key) => lookup.get(key))
      .filter((store): store is StoreOpportunity => Boolean(store));
  }, [fallbackPlan.orderedStops, liveRoute, stores]);

  const effectiveMiles = liveRoute?.distanceMiles ?? fallbackPlan.estimatedMiles;
  const effectiveFuelCost =
    mpg > 0 ? (effectiveMiles / mpg) * Math.max(0, gasPrice) : 0;
  const grossPotentialProfit = selectedStores.reduce(
    (sum, store) => sum + store.totalPotentialProfit,
    0,
  );
  const netTripProfit = grossPotentialProfit - effectiveFuelCost;
  const profitPerTripMile =
    effectiveMiles > 0 ? netTripProfit / effectiveMiles : 0;

  function toggleStore(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
    setLiveRoute(null);
    setLiveError("");
  }

  async function requestLiveRoute() {
    if (selectedStores.length === 0) return;

    setLoadingLiveRoute(true);
    setLiveError("");

    try {
      const data = await flipScoutApi.optimizeRoute({
        origin: {
          latitude: originLatitude,
          longitude: originLongitude,
        },
        stores: selectedStores.map((store) => ({
          key: store.key,
          storeName: store.storeName,
          latitude: store.latitude,
          longitude: store.longitude,
        })),
      });

      setLiveRoute(data as LiveRouteResult);
    } catch (error) {
      setLiveRoute(null);
      setLiveError(
        error instanceof Error
          ? error.message
          : t("route.unable"),
      );
    } finally {
      setLoadingLiveRoute(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("route.context")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {t("route.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            {t("route.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[610px]">
          <NumberField label="MPG" value={mpg} onChange={setMpg} step={1} />
          <NumberField
            label={t("route.gasPerGallon")}
            value={gasPrice}
            onChange={setGasPrice}
          />
          <NumberField
            label={t("route.fallbackMultiplier")}
            value={roadMultiplier}
            onChange={(value) => {
              setRoadMultiplier(value);
              setLiveRoute(null);
            }}
            step={0.05}
          />
          <NumberField
            label={t("route.startLatitude")}
            value={originLatitude}
            onChange={(value) => {
              setOriginLatitude(value);
              setLiveRoute(null);
            }}
            step={0.0001}
          />
          <NumberField
            label={t("route.startLongitude")}
            value={originLongitude}
            onChange={(value) => {
              setOriginLongitude(value);
              setLiveRoute(null);
            }}
            step={0.0001}
          />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs text-neutral-500">{t("route.selectedStores")}</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {selectedStores.length}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={requestLiveRoute}
          disabled={loadingLiveRoute || selectedStores.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingLiveRoute ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Navigation size={16} />
          )}
          {loadingLiveRoute ? t("route.calculating") : t("route.useLive")}
        </button>

        <span
          className={[
            "rounded-lg border px-3 py-2 text-xs",
            liveRoute
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-black/20 text-neutral-500",
          ].join(" ")}
        >
          {liveRoute ? t("route.mapboxActive") : t("route.localActive")}
        </span>
      </div>

      {liveError && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          {liveError}
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stores.map((store) => {
          const selected = selectedKeys.includes(store.key);

          return (
            <button
              key={store.key}
              type="button"
              onClick={() => toggleStore(store.key)}
              className={[
                "rounded-xl border p-4 text-left transition",
                selected
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-white/10 bg-black/20 hover:bg-black/40",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {store.storeName}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {store.city} · {currency(store.totalPotentialProfit)} {t("route.potential")}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-700">
                    {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                  </div>
                </div>

                <div
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    selected
                      ? "border-emerald-400 bg-emerald-400 text-black"
                      : "border-white/15 text-transparent",
                  ].join(" ")}
                >
                  <Check size={14} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          icon={Route}
          label={liveRoute ? t("route.roadMiles") : t("route.estimatedRoadMiles")}
          value={`${effectiveMiles.toFixed(1)} mi`}
        />
        <Metric
          icon={Timer}
          label={t("route.driveTime")}
          value={
            liveRoute
              ? `${Math.round(liveRoute.durationMinutes)} min`
              : t("route.fallback")
          }
        />
        <Metric
          icon={Fuel}
          label={t("route.fuelCost")}
          value={currency(effectiveFuelCost)}
        />
        <Metric
          icon={WalletCards}
          label={t("route.grossProfit")}
          value={currency(grossPotentialProfit)}
        />
        <Metric
          icon={WalletCards}
          label={t("route.netTripProfit")}
          value={currency(netTripProfit)}
        />
        <Metric
          icon={Route}
          label={t("route.profitPerMile")}
          value={currency(profitPerTripMile)}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <RouteMap
          stores={orderedStores}
          origin={{
            latitude: originLatitude,
            longitude: originLongitude,
          }}
          geometry={liveRoute?.geometry}
        />

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <MapPinned size={14} />
            {t("route.visitOrder")}
          </div>

          {orderedStores.length > 0 ? (
            <div className="mt-4 space-y-2">
              {orderedStores.map((store, index) => {
                const liveLeg = liveRoute?.legs[index];
                const fallbackLeg = fallbackPlan.legs[index];

                return (
                  <div
                    key={store.key}
                    className="rounded-xl border border-white/5 bg-black/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {index + 1}. {store.storeName}
                        </div>
                        <div className="mt-1 text-xs text-neutral-600">
                          {t("route.buyScore")} {store.averageBuyScore.toFixed(0)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-neutral-300">
                          {(
                            liveLeg?.distanceMiles ??
                            fallbackLeg?.estimatedRoadMiles ??
                            0
                          ).toFixed(1)}{" "}
                          mi
                        </div>
                        {liveLeg && (
                          <div className="mt-1 text-xs text-neutral-600">
                            {Math.round(liveLeg.durationMinutes)} min
                          </div>
                        )}
                        <div className="mt-1 text-xs text-emerald-300">
                          {currency(store.totalPotentialProfit)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              {t("route.selectStore")}
            </p>
          )}

          <p className="mt-5 text-xs leading-5 text-neutral-600">
            {t("route.fallbackInfo")}
          </p>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="rounded-xl border border-white/10 bg-black/30 p-3">
      <span className="block text-xs text-neutral-500">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full bg-transparent text-lg font-semibold text-white outline-none"
      />
    </label>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
