"use client";

import { Heart } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useI18n } from "@/components/i18n/I18nProvider";

export function SaveDealButton({
  dealId,
  compact = false,
}: {
  dealId: string;
  compact?: boolean;
}) {
  const { isSaved, toggle } = useWatchlist();
  const { t } = useI18n();
  const saved = isSaved(dealId);

  return (
    <button
      type="button"
      onClick={() => toggle(dealId)}
      aria-pressed={saved}
      aria-label={saved ? t("watchlist.removeAria") : t("watchlist.saveAria")}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border text-xs font-medium transition",
        compact ? "px-3 py-2" : "px-4 py-3",
        saved
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
          : "border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <Heart size={15} fill={saved ? "currentColor" : "none"} />
      {saved ? t("watchlist.saved") : t("watchlist.save")}
    </button>
  );
}
