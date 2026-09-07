"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, Flame, PackageSearch, Store } from "lucide-react";
import { DealCard } from "@/components/dashboard/DealCard";
import { DealFilters } from "@/components/dashboard/DealFilters";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDeals } from "@/hooks/use-deals";
import { useI18n } from "@/components/i18n/I18nProvider";

export function Dashboard() {
  const { deals, loading, error, refresh } = useDeals();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [retailer, setRetailer] = useState("__all__");
  const [category, setCategory] = useState("__all__");

  const filteredDeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return deals.filter((deal) => {
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
        retailer === "__all__" || deal.retailer === retailer;

      const matchesCategory =
        category === "__all__" || deal.category === category;

      return matchesQuery && matchesRetailer && matchesCategory;
    });
  }, [deals, query, retailer, category]);

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
              {t("dashboard.context")}
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("dashboard.title")}
            </h1>

            <p className="mt-2 text-sm text-neutral-400">
              {t("dashboard.subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("dashboard.scanning") : t("dashboard.scan")}
          </button>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("dashboard.potentialProfit")}
            value={`$${totalProfit.toFixed(0)}`}
            helper={t("dashboard.potentialProfitHelper")}
            icon={CircleDollarSign}
          />

          <KpiCard
            label={t("dashboard.strongBuys")}
            value={String(strongBuys)}
            helper={t("dashboard.strongBuysHelper")}
            icon={Flame}
          />

          <KpiCard
            label={t("dashboard.unitsAvailable")}
            value={String(inventory)}
            helper={t("dashboard.unitsAvailableHelper")}
            icon={PackageSearch}
          />

          <KpiCard
            label={t("dashboard.stores")}
            value={String(uniqueStores)}
            helper={t("dashboard.storesHelper")}
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
            retailers={Array.from(
              new Set(deals.map((deal) => deal.retailer)),
            ).sort()}
            categories={Array.from(
              new Set(deals.map((deal) => deal.category)),
            ).sort()}
          />
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            {error}
          </div>
        )}

        <section id="deals">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{t("dashboard.bestDeals")}</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {filteredDeals.length} {t("dashboard.opportunitiesFound")}
              </p>
            </div>

            <select className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-neutral-300 outline-none transition focus:border-white/25">
              <option>{t("sort.buyScore")}</option>
              <option>{t("sort.profit")}</option>
              <option>{t("sort.roi")}</option>
              <option>{t("sort.nearest")}</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}

            {filteredDeals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-neutral-500">
                {t("dashboard.noMatches")}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
