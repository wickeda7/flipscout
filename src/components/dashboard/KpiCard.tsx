import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

export function KpiCard({ label, value, helper, icon: Icon }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon"><Icon size={17} /></div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-helper">{helper}</div>
    </div>
  );
}
