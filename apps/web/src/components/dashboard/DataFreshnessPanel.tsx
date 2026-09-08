"use client";

import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { IngestionSourceStatus } from "@flipscout/types";
import { useI18n } from "@/components/i18n/I18nProvider";

function freshnessClasses(
  freshness: IngestionSourceStatus["freshness"],
): string {
  switch (freshness) {
    case "fresh":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "aging":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "stale":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    default:
      return "border-white/10 bg-white/[0.03] text-neutral-400";
  }
}

function freshnessLabel(
  freshness: IngestionSourceStatus["freshness"],
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (freshness) {
    case "fresh":
      return t("dataHealth.fresh");
    case "aging":
      return t("dataHealth.aging");
    case "stale":
      return t("dataHealth.stale");
    default:
      return t("dataHealth.unknown");
  }
}

function FreshnessIcon({
  freshness,
}: {
  freshness: IngestionSourceStatus["freshness"];
}) {
  if (freshness === "fresh") return <CheckCircle2 size={14} />;
  if (freshness === "stale") return <AlertTriangle size={14} />;
  if (freshness === "aging") return <Clock3 size={14} />;
  return <Activity size={14} />;
}

export function DataFreshnessPanel({
  sources,
  staleAfterMinutes,
}: {
  sources: IngestionSourceStatus[];
  staleAfterMinutes: number;
}) {
  const { t } = useI18n();

  if (sources.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
            {t("dataHealth.context")}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">
            {t("dataHealth.title")}
          </h2>
        </div>
        <p className="text-xs text-neutral-600">
          {t("dataHealth.staleAfter").replace(
            "{minutes}",
            String(staleAfterMinutes),
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sources.map((source) => (
          <div
            key={source.source}
            className="flex min-w-[190px] flex-1 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-neutral-200">
                {source.source}
              </div>
              <div className="mt-1 text-[11px] text-neutral-600">
                {source.activeDeals} {t("dataHealth.activeDeals")} ·{" "}
                {source.stores} {t("dataHealth.stores")}
              </div>
            </div>

            <div
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${freshnessClasses(
                source.freshness,
              )}`}
            >
              <FreshnessIcon freshness={source.freshness} />
              {freshnessLabel(source.freshness, t)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
