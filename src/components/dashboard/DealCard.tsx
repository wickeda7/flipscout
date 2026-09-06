import { Clock3, MapPin, Package2, Store } from "lucide-react";
import type { Deal } from "@/types/deal";

function statusLabel(status: Deal["status"]) {
  return status === "strong-buy" ? "STRONG BUY" : status.toUpperCase();
}

export function DealCard({ deal }: { deal: Deal }) {
  const discount = Math.round(((deal.retailPrice - deal.clearancePrice) / deal.retailPrice) * 100);
  return (
    <article className="deal-card">
      <div className="deal-top">
        <div>
          <div className="deal-brand">{deal.brand}</div>
          <h3 className="deal-name">{deal.productName}</h3>
        </div>
        <div className={`score ${deal.status}`}>
          <div className="score-number">{deal.buyScore}</div>
          <div className="score-label">{statusLabel(deal.status)}</div>
        </div>
      </div>

      <div className="deal-meta">
        <span><Store size={14} />{deal.retailer}</span>
        <span><MapPin size={14} />{deal.distanceMiles} mi</span>
        <span><Package2 size={14} />{deal.inventory} in stock</span>
        <span><Clock3 size={14} />{deal.updatedMinutesAgo}m ago</span>
      </div>

      <div className="metrics-grid">
        <Metric label="Clearance" value={`$${deal.clearancePrice.toFixed(2)}`} helper={`${discount}% off`} />
        <Metric label="Expected resale" value={`$${deal.resalePrice.toFixed(2)}`} helper="market estimate" />
        <Metric label="Est. profit" value={`$${deal.estimatedProfit.toFixed(2)}`} helper="after costs" />
        <Metric label="ROI" value={`${deal.roi.toFixed(0)}%`} helper="on purchase cost" />
      </div>
    </article>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-helper">{helper}</div>
    </div>
  );
}
