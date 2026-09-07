"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, Flame, PackageSearch, Store } from "lucide-react";
import { DealCard } from "@/components/dashboard/DealCard";
import { DealFilters } from "@/components/dashboard/DealFilters";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockDeals } from "@/lib/mock-deals";

export function Dashboard() {
  const [query, setQuery] = useState("");
  const [retailer, setRetailer] = useState("All stores");
  const [category, setCategory] = useState("All categories");

  const filteredDeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return mockDeals.filter((deal) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          deal.productName,
          deal.brand,
          deal.retailer,
          deal.storeName,
          deal.city,
          deal.category,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesRetailer =
        retailer === "All stores" || deal.retailer === retailer;

      const matchesCategory =
        category === "All categories" || deal.category === category;

      return matchesQuery && matchesRetailer && matchesCategory;
    });
  }, [query, retailer, category]);

  const totalProfit = filteredDeals.reduce(
    (sum, deal) => sum + deal.estimatedProfit,
    0,
  );

  const strongBuys = filteredDeals.filter(
    (deal) => deal.buyScore >= 90,
  ).length;

  const inventory = filteredDeals.reduce(
    (sum, deal) => sum + deal.inventory,
    0,
  );

  const uniqueStores = new Set(filteredDeals.map((deal) => deal.storeName)).size;

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm text-neutral-500">
              Saturday, September 5
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Today&apos;s opportunities
            </h1>

            <p className="mt-2 text-sm text-neutral-400">
              Clearance inventory ranked by expected resale value.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            Scan nearby stores
          </button>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Potential profit"
            value={`$${totalProfit.toFixed(0)}`}
            helper="across filtered deals"
            icon={CircleDollarSign}
          />

          <KpiCard
            label="Strong buys"
            value={String(strongBuys)}
            helper="score 90 or higher"
            icon={Flame}
          />

          <KpiCard
            label="Units available"
            value={String(inventory)}
            helper="reported local inventory"
            icon={PackageSearch}
          />

          <KpiCard
            label="Stores"
            value={String(uniqueStores)}
            helper="with matching opportunities"
            icon={Store}
          />
        </section>

        <section className="mb-6">
          <DealFilters
            query={query}
            onQueryChange={setQuery}
            retailer={retailer}
            onRetailerChange={setRetailer}
            category={category}
            onCategoryChange={setCategory}
          />
        </section>

        <section id="deals">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Best deals</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {filteredDeals.length} opportunities found
              </p>
            </div>

            <select className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-neutral-300 outline-none transition focus:border-white/25">
              <option>Highest buy score</option>
              <option>Highest profit</option>
              <option>Highest ROI</option>
              <option>Nearest first</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}

            {filteredDeals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-neutral-500">
                No deals match these filters.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
