import Link from "next/link";
import { MapPin, Package, TrendingUp } from "lucide-react";
import type { StoreOpportunity } from "@/lib/store-planning";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function StoreOpportunityCard({
  store,
  rank,
}: {
  store: StoreOpportunity;
  rank: number;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-white/10 bg-black px-2 py-1 text-xs font-semibold text-neutral-400">
              #{rank}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {store.retailer}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-semibold text-white">
            {store.storeName}
          </h2>

          <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
            <MapPin size={15} />
            {store.city}, {store.state} · {store.distanceMiles.toFixed(1)} mi
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs text-neutral-500">Potential profit</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-white">
            {currency(store.totalPotentialProfit)}
          </div>
          <div className="mt-1 text-xs text-emerald-300">
            {currency(store.profitPerMile)} / mile
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric
          icon={TrendingUp}
          label="Avg BUY score"
          value={store.averageBuyScore.toFixed(0)}
        />
        <Metric
          icon={Package}
          label="Deals"
          value={String(store.dealCount)}
        />
        <Metric
          icon={Package}
          label="Units"
          value={String(store.unitCount)}
        />
        <Metric
          icon={TrendingUp}
          label="Strong buys"
          value={String(store.strongBuyCount)}
        />
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Best opportunities
        </div>

        <div className="mt-3 space-y-2">
          {store.deals.slice(0, 3).map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex flex-col justify-between gap-2 rounded-xl border border-white/5 bg-black/30 px-3 py-3 transition hover:border-white/10 hover:bg-black/50 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-neutral-200">
                  {deal.productName}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  ${deal.clearancePrice.toFixed(2)} buy · {deal.inventory} units
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold text-emerald-300">
                  +{currency(deal.estimatedProfit)}
                </span>
                <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-neutral-400">
                  {deal.buyScore}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-3">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
