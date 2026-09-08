"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DealCard } from "@/components/dashboard/DealCard";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useDeals } from "@/hooks/use-deals";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function WatchlistPage() {
  const { savedIds, clear, loading: watchlistLoading, error: watchlistError } = useWatchlist();
  const { t } = useI18n();
  const { deals, loading: dealsLoading, error: dealsError } = useDeals();
  const loading = dealsLoading || watchlistLoading;
  const error = dealsError || watchlistError;

  const savedDeals = deals.filter((deal) => savedIds.includes(deal.id));
  const totalProfit = savedDeals.reduce(
    (sum, deal) => sum + deal.estimatedProfit,
    0,
  );
  const units = savedDeals.reduce((sum, deal) => sum + deal.inventory, 0);

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-neutral-500">{t("watchlist.context")}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("nav.watchlist")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                {t("watchlist.subtitle")}
              </p>
            </div>

            {savedDeals.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                <Trash2 size={16} />
                {t("watchlist.clear")}
              </button>
            )}
          </header>

          {error && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
              {error}
            </div>
          )}

          {loading ? (
            <section className="rounded-2xl border border-white/10 p-10 text-center text-sm text-neutral-500">
              {t("watchlist.loading")}
            </section>
          ) : savedDeals.length > 0 ? (
            <>
              <section className="mb-6 grid gap-3 sm:grid-cols-3">
                <Summary
                  label={t("watchlist.savedDeals")}
                  value={String(savedDeals.length)}
                  helper={t("watchlist.trackedHelper")}
                />
                <Summary
                  label={t("watchlist.potentialProfit")}
                  value={`$${totalProfit.toFixed(0)}`}
                  helper={t("watchlist.profitHelper")}
                />
                <Summary
                  label={t("watchlist.unitsAvailable")}
                  value={String(units)}
                  helper={t("watchlist.unitsHelper")}
                />
              </section>

              <section className="space-y-3">
                {savedDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-neutral-400">
                <Heart size={22} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">
                {t("watchlist.emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {t("watchlist.emptyBody")}
              </p>
              <Link
                href="/#deals"
                className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                {t("watchlist.browse")}
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function Summary({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-xs text-neutral-600">{helper}</div>
    </div>
  );
}
