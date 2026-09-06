import { Clock3, MapPin, Package2, Store } from "lucide-react";
import type { Deal } from "@/types/deal";

function statusClasses(status: Deal["status"]) {
  switch (status) {
    case "strong-buy":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "buy":
      return "border-lime-500/30 bg-lime-500/10 text-lime-300";
    case "maybe":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-neutral-700 bg-neutral-800/70 text-neutral-300";
  }
}

function statusLabel(status: Deal["status"]) {
  if (status === "strong-buy") return "STRONG BUY";
  return status.toUpperCase();
}

export function DealCard({ deal }: { deal: Deal }) {
  const discount = Math.round(
    ((deal.retailPrice - deal.clearancePrice) / deal.retailPrice) * 100,
  );

  return (
    <article className="rounded-2xl border border-white/10 bg-neutral-950 p-5 transition-colors hover:border-white/20">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {deal.brand}
          </div>
          <h3 className="max-w-xl text-lg font-semibold leading-snug text-neutral-100">
            {deal.productName}
          </h3>
        </div>

        <div
          className={`shrink-0 rounded-xl border px-3 py-2 text-center ${statusClasses(
            deal.status,
          )}`}
        >
          <div className="text-xl font-bold leading-none">{deal.buyScore}</div>
          <div className="mt-1 text-[10px] font-semibold tracking-wide">
            {statusLabel(deal.status)}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <Store size={14} />
          {deal.retailer}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={14} />
          {deal.distanceMiles} mi
        </span>
        <span className="flex items-center gap-1.5">
          <Package2 size={14} />
          {deal.inventory} in stock
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} />
          {deal.updatedMinutesAgo}m ago
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Clearance"
          value={`$${deal.clearancePrice.toFixed(2)}`}
          helper={`${discount}% off`}
        />
        <Metric
          label="Expected resale"
          value={`$${deal.resalePrice.toFixed(2)}`}
          helper="market estimate"
        />
        <Metric
          label="Est. profit"
          value={`$${deal.estimatedProfit.toFixed(2)}`}
          helper="after costs"
        />
        <Metric
          label="ROI"
          value={`${deal.roi.toFixed(0)}%`}
          helper="on purchase cost"
        />
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.035] p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-neutral-100">{value}</div>
      <div className="mt-1 text-[11px] text-neutral-600">{helper}</div>
    </div>
  );
}
