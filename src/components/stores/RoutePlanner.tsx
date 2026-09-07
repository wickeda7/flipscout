"use client";

import { useMemo, useState } from "react";
import { Check, Fuel, Route, WalletCards } from "lucide-react";
import type { StoreOpportunity } from "@/lib/store-planning";
import { optimizeRoute } from "@/lib/route-optimizer";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function RoutePlanner({ stores }: { stores: StoreOpportunity[] }) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    stores.slice(0, Math.min(3, stores.length)).map((store) => store.key),
  );
  const [mpg, setMpg] = useState(25);
  const [gasPrice, setGasPrice] = useState(3.5);
  const [detourMiles, setDetourMiles] = useState(3);

  const selectedStores = useMemo(
    () => stores.filter((store) => selectedKeys.includes(store.key)),
    [stores, selectedKeys],
  );

  const plan = useMemo(
    () =>
      optimizeRoute(selectedStores, {
        mpg,
        gasPricePerGallon: gasPrice,
        detourMilesPerExtraStop: detourMiles,
      }),
    [selectedStores, mpg, gasPrice, detourMiles],
  );

  function toggleStore(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Route optimizer
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Build today&apos;s buying trip
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Select stores and adjust your vehicle assumptions. FlipScout
            estimates driving cost and net trip profit from the opportunities
            you choose.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
          <NumberField label="MPG" value={mpg} onChange={setMpg} step={1} />
          <NumberField
            label="Gas / gal"
            value={gasPrice}
            onChange={setGasPrice}
          />
          <NumberField
            label="Detour / stop"
            value={detourMiles}
            onChange={setDetourMiles}
          />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs text-neutral-500">Selected</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {selectedStores.length}
            </div>
          </div>
        </div>
      </div>

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
                    {store.distanceMiles.toFixed(1)} mi ·{" "}
                    {currency(store.totalPotentialProfit)} potential
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={Route}
          label="Est. trip miles"
          value={`${plan.estimatedMiles.toFixed(1)} mi`}
        />
        <Metric
          icon={Fuel}
          label="Fuel cost"
          value={currency(plan.estimatedFuelCost)}
        />
        <Metric
          icon={WalletCards}
          label="Gross profit"
          value={currency(plan.grossPotentialProfit)}
        />
        <Metric
          icon={WalletCards}
          label="Net trip profit"
          value={currency(plan.netTripProfit)}
        />
        <Metric
          icon={Route}
          label="Profit / mile"
          value={currency(plan.profitPerTripMile)}
        />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Suggested visit order
        </div>

        {plan.orderedStops.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {plan.orderedStops.map((store, index) => (
              <div key={store.key} className="flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-neutral-300">
                  {index + 1}. {store.storeName}
                </span>
                {index < plan.orderedStops.length - 1 && (
                  <span className="text-neutral-700">→</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            Select at least one store to create a route.
          </p>
        )}

        <p className="mt-4 text-xs leading-5 text-neutral-600">
          MVP estimate: stores are ordered nearest-to-farthest. Trip mileage is
          twice the farthest store distance plus the detour allowance for each
          additional stop. Exact road routing requires store coordinates and a
          maps routing provider.
        </p>
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
        min="0"
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
