export const dynamic = "force-dynamic";

import { Route, Store, WalletCards } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { StoreOpportunityCard } from "@/components/stores/StoreOpportunityCard";
import { RoutePlanner } from "@/components/stores/RoutePlanner";
import { flipScoutApi } from "@/lib/api";
import { groupDealsByStore } from "@/lib/store-planning";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function StoresPage() {
  const deals = await flipScoutApi.listDeals();
  const stores = groupDealsByStore(deals);

  const totalPotentialProfit = stores.reduce(
    (sum, store) => sum + store.totalPotentialProfit,
    0,
  );

  const bestStop = stores[0];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-sm text-neutral-500">Trip planning</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Stores worth driving to
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              FlipScout ranks nearby stores by potential resale profit per mile,
              helping you prioritize the most valuable stops first.
            </p>
          </header>

          <section className="mb-6 grid gap-3 md:grid-cols-3">
            <Summary
              icon={Store}
              label="Stores"
              value={String(stores.length)}
              helper="locations with active opportunities"
            />
            <Summary
              icon={WalletCards}
              label="Potential profit"
              value={currency(totalPotentialProfit)}
              helper="inventory-adjusted opportunity"
            />
            <Summary
              icon={Route}
              label="Best first stop"
              value={bestStop?.storeName ?? "—"}
              helper={
                bestStop
                  ? `${currency(bestStop.profitPerMile)} potential profit per mile`
                  : "No opportunities available"
              }
            />
          </section>

          <RoutePlanner stores={stores} />

          <section className="mb-6 rounded-2xl border border-white/10 bg-black p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Suggested route strategy
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Start with the highest-value stops
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
                  The MVP ranking uses potential profit divided by one-way
                  distance. It does not yet calculate actual multi-stop road
                  distance, traffic, fuel cost, or store-to-store routing.
                </p>
              </div>

              {bestStop && (
                <div className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <div className="text-xs text-emerald-300/70">
                    Recommended first stop
                  </div>
                  <div className="mt-1 font-semibold text-emerald-100">
                    {bestStop.storeName}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            {stores.map((store, index) => (
              <StoreOpportunityCard
                key={store.key}
                store={store}
                rank={index + 1}
              />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {value}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black p-2 text-neutral-400">
          <Icon size={17} />
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-neutral-600">{helper}</div>
    </div>
  );
}
