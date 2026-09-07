"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Package2, Store } from "lucide-react";
import type { Deal } from "@/types/deal";
import { Sidebar } from "@/components/layout/Sidebar";
import { SaveDealButton } from "@/components/watchlist/SaveDealButton";
import { analyzeDeal } from "@/lib/deal-analysis";
import { useI18n } from "@/components/i18n/I18nProvider";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function DealDetailView({ deal }: { deal: Deal }) {
  const { t } = useI18n();
  const analysis = analyzeDeal(deal);

  const scoreItems = [
    [t("detail.scoreRoi"), analysis.score.breakdown.roi, "30%"],
    [t("detail.scoreProfit"), analysis.score.breakdown.profit, "30%"],
    [t("detail.scoreDiscount"), analysis.score.breakdown.discount, "15%"],
    [t("detail.scoreInventory"), analysis.score.breakdown.inventory, "15%"],
    [t("detail.scoreDistance"), analysis.score.breakdown.distance, "10%"],
  ] as const;

  const status =
    deal.status === "strong-buy"
      ? t("status.strong-buy")
      : deal.status === "buy"
        ? t("status.buy")
        : deal.status === "maybe"
          ? t("status.maybe")
          : t("status.skip");

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/#deals"
            className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft size={16} /> {t("detail.back")}
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
                <span className="flex items-center gap-1.5"><Package2 size={15} />{deal.inventory} {t("deal.inStock")}</span>
                <span className="flex items-center gap-1.5"><Clock3 size={15} />{t("detail.updated")} {deal.updatedMinutesAgo}m {t("deal.ago")}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-5 text-center">
              <div className="text-4xl font-bold text-emerald-300">{deal.buyScore}</div>
              <div className="mt-1 text-xs font-semibold tracking-wider text-emerald-200">
                {status}
              </div>
            </div>
          </header>

          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label={t("detail.clearancePrice")} value={currency(deal.clearancePrice)} helper={`${analysis.discountPercent.toFixed(0)}% ${t("detail.belowRetail")}`} />
            <Metric label={t("detail.expectedResale")} value={currency(deal.resalePrice)} helper={t("detail.planningEstimate")} />
            <Metric label={t("detail.expectedProfit")} value={currency(deal.estimatedProfit)} helper={t("detail.afterSellingCosts")} />
            <Metric label="ROI" value={`${deal.roi.toFixed(0)}%`} helper={`${deal.margin.toFixed(0)}% ${t("detail.profitMargin")}`} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">{t("detail.shouldBuy")}</h2>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-sm text-neutral-400">{t("detail.maxPurchase")}</div>
                  <div className="mt-2 text-4xl font-bold tracking-tight text-white">
                    {currency(analysis.maxPurchase.recommendedMaxPurchasePrice)}
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">{t("detail.maxPurchaseHelp")}</p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Metric label={t("detail.profitLimit")} value={currency(analysis.maxPurchase.byProfitTarget)} helper={t("detail.profitLimitHelp")} compact />
                  <Metric label={t("detail.roiLimit")} value={currency(analysis.maxPurchase.byRoiTarget)} helper={t("detail.roiLimitHelp")} compact />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">{t("detail.resaleScenarios")}</h2>
                <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                  <div className="grid grid-cols-4 bg-white/[0.04] px-4 py-3 text-xs text-neutral-500">
                    <span>{t("detail.scenario")}</span><span>{t("detail.salePrice")}</span><span>{t("detail.profit")}</span><span>ROI</span>
                  </div>
                  {analysis.scenarios.map((scenario) => (
                    <div key={scenario.key} className="grid grid-cols-4 border-t border-white/10 px-4 py-4 text-sm">
                      <span className="font-medium text-neutral-200">{t(`detail.scenario.${scenario.key}`)}</span>
                      <span className="text-neutral-300">{currency(scenario.resalePrice)}</span>
                      <span className={scenario.netProfit >= 0 ? "text-emerald-300" : "text-red-300"}>{currency(scenario.netProfit)}</span>
                      <span className="text-neutral-300">{scenario.roiPercent.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">{t("detail.costBreakdown")}</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label={t("detail.purchase")} value={currency(deal.clearancePrice)} helper={t("detail.storeCost")} compact />
                  <Metric label={t("detail.marketplaceFee")} value={`${deal.marketplaceFeePercent.toFixed(2)}%`} helper={t("detail.planningAssumption")} compact />
                  <Metric label={t("detail.shipping")} value={currency(deal.shippingCost)} helper={t("detail.shippingHelp")} compact />
                  <Metric label={t("detail.otherCosts")} value={currency(deal.otherCosts)} helper={t("detail.otherCostsHelp")} compact />
                  <Metric label={t("detail.breakEven")} value={currency(deal.breakEvenPrice)} helper={t("detail.breakEvenHelp")} compact />
                  <Metric label={t("detail.distance")} value={`${deal.distanceMiles.toFixed(1)} mi`} helper={t("detail.distanceHelp")} compact />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h2 className="text-lg font-semibold text-white">{t("detail.scoreBreakdown")}</h2>
                <p className="mt-1 text-xs text-neutral-500">{t("detail.scoreModel")}</p>
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
                <h2 className="text-lg font-semibold text-white">{t("detail.riskFlags")}</h2>
                <div className="mt-4 space-y-3">
                  {analysis.risks.map((risk) => (
                    <div key={risk} className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-neutral-400">
                      {t(`detail.risk.${risk}`)}
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
                  {t("detail.openCalculator")}
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
