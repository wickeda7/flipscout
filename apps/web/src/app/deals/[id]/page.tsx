export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MapPin, Package2, Store } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SaveDealButton } from "@/components/watchlist/SaveDealButton";
import { analyzeDeal } from "@/lib/deal-analysis";
import { flipScoutApi } from "@/lib/api";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await flipScoutApi.getDeal(id);
  if (!deal) notFound();

  const analysis = analyzeDeal(deal);
  const scoreItems = [
    ["ROI", analysis.score.breakdown.roi, "30%"],
    ["Profit", analysis.score.breakdown.profit, "30%"],
    ["Discount", analysis.score.breakdown.discount, "15%"],
    ["Inventory", analysis.score.breakdown.inventory, "15%"],
    ["Distance", analysis.score.breakdown.distance, "10%"],
  ] as const;

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft size={16} /> Back to deals
          </Link>

          <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {deal.brand} · {deal.category}
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {deal.productName}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-400">
                <span className="flex items-center gap-1.5"><Store size={15} />{deal.retailer}</span>
                <span className="flex items-center gap-1.5"><MapPin size={15} />{deal.storeName}, {deal.city}, {deal.state}</span>
                <span className="flex items-center gap-1.5"><Package2 size={15} />{deal.inventory} in stock</span>
                <span className="flex items-center gap-1.5"><Clock3 size={15} />Updated {deal.updatedMinutesAgo}m ago</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-5 text-center">
              <div className="text-4xl font-bold text-emerald-300">{deal.buyScore}</div>
              <div className="mt-1 text-xs font-semibold tracking-wider text-emerald-200">
                {analysis.score.label}
              </div>
            </div>
          </header>

          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Clearance price" value={currency(deal.clearancePrice)} helper={`${analysis.discountPercent.toFixed(0)}% below retail`} />
            <Metric label="Expected resale" value={currency(deal.resalePrice)} helper="planning estimate" />
            <Metric label="Expected profit" value={currency(deal.estimatedProfit)} helper="after selling costs" />
            <Metric label="ROI" value={`${deal.roi.toFixed(0)}%`} helper={`${deal.margin.toFixed(0)}% profit margin`} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">Should I buy it?</h2>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-sm text-neutral-400">Recommended maximum purchase price</div>
                  <div className="mt-2 text-4xl font-bold tracking-tight text-white">
                    {currency(analysis.maxPurchase.recommendedMaxPurchasePrice)}
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    Uses a default target of at least $30 profit and 100% ROI.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Metric label="Profit-limit price" value={currency(analysis.maxPurchase.byProfitTarget)} helper="max price for $30 profit" compact />
                  <Metric label="ROI-limit price" value={currency(analysis.maxPurchase.byRoiTarget)} helper="max price for 100% ROI" compact />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">Resale scenarios</h2>
                <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                  <div className="grid grid-cols-4 bg-white/[0.04] px-4 py-3 text-xs text-neutral-500">
                    <span>Scenario</span><span>Sale price</span><span>Profit</span><span>ROI</span>
                  </div>
                  {analysis.scenarios.map((scenario) => (
                    <div key={scenario.label} className="grid grid-cols-4 border-t border-white/10 px-4 py-4 text-sm">
                      <span className="font-medium text-neutral-200">{scenario.label}</span>
                      <span className="text-neutral-300">{currency(scenario.resalePrice)}</span>
                      <span className={scenario.netProfit >= 0 ? "text-emerald-300" : "text-red-300"}>{currency(scenario.netProfit)}</span>
                      <span className="text-neutral-300">{scenario.roiPercent.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">Cost breakdown</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label="Purchase" value={currency(deal.clearancePrice)} helper="store cost" compact />
                  <Metric label="Marketplace fee" value={`${deal.marketplaceFeePercent.toFixed(2)}%`} helper="planning assumption" compact />
                  <Metric label="Shipping" value={currency(deal.shippingCost)} helper="estimated outbound cost" compact />
                  <Metric label="Other costs" value={currency(deal.otherCosts)} helper="supplies / misc." compact />
                  <Metric label="Break-even" value={currency(deal.breakEvenPrice)} helper="minimum resale price" compact />
                  <Metric label="Distance" value={`${deal.distanceMiles.toFixed(1)} mi`} helper="one-way store distance" compact />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">Score breakdown</h2>
                <p className="mt-1 text-xs text-neutral-500">Current Phase 2 weighting model.</p>
                <div className="mt-5 space-y-4">
                  {scoreItems.map(([label, value, weight]) => (
                    <div key={label}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-neutral-400">{label}</span>
                        <span className="text-neutral-500">{value.toFixed(0)}/100 · {weight}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-white/70" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">Risk flags</h2>
                <div className="mt-4 space-y-3">
                  {analysis.risks.map((risk) => (
                    <div key={risk} className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-neutral-400">
                      {risk}
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SaveDealButton dealId={deal.id} />
                <Link
                  href="/calculator"
                  className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-neutral-200"
                >
                  Open in profit calculator
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  compact = false,
}: {
  label: string;
  value: string;
  helper: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.025] ${compact ? "p-3" : "p-4"}`}>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`${compact ? "mt-1 text-lg" : "mt-2 text-2xl"} font-semibold text-neutral-100`}>{value}</div>
      <div className="mt-1 text-[11px] text-neutral-600">{helper}</div>
    </div>
  );
}
