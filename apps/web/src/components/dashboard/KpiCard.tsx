import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}

export function KpiCard({ label, value, helper, icon: Icon }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-5 flex items-start justify-between">
        <span className="text-sm text-neutral-400">{label}</span>
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-300">
          <Icon size={17} />
        </div>
      </div>

      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-xs text-neutral-500">{helper}</div>
    </div>
  );
}
