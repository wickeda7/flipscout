"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DealCard } from "@/components/dashboard/DealCard";
import { useWatchlist } from "@/hooks/use-watchlist";
import { mockDeals } from "@/lib/mock-deals";

export default function WatchlistPage() {
  const { savedIds, clear } = useWatchlist();

  const savedDeals = mockDeals.filter((deal) => savedIds.includes(deal.id));
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
              <p className="text-sm text-neutral-500">Saved opportunities</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Watchlist
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                Keep the deals you want to revisit before making a buying trip.
              </p>
            </div>

            {savedDeals.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                <Trash2 size={16} />
                Clear watchlist
              </button>
            )}
          </header>

          {savedDeals.length > 0 ? (
            <>
              <section className="mb-6 grid gap-3 sm:grid-cols-3">
                <Summary
                  label="Saved deals"
                  value={String(savedDeals.length)}
                  helper="opportunities being tracked"
                />
                <Summary
                  label="Potential profit"
                  value={`$${totalProfit.toFixed(0)}`}
                  helper="expected profit across saved deals"
                />
                <Summary
                  label="Units available"
                  value={String(units)}
                  helper="reported local inventory"
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
                No saved deals yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Save promising clearance opportunities from the dashboard or
                deal analysis page and they will appear here.
              </p>
              <Link
                href="/#deals"
                className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Browse deals
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
