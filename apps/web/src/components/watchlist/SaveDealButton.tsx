"use client";

import { Heart } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";

export function SaveDealButton({
  dealId,
  compact = false,
}: {
  dealId: string;
  compact?: boolean;
}) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(dealId);

  return (
    <button
      type="button"
      onClick={() => toggle(dealId)}
      aria-pressed={saved}
      aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border text-xs font-medium transition",
        compact ? "px-3 py-2" : "px-4 py-3",
        saved
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
          : "border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <Heart size={15} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Watchlist"}
    </button>
  );
}
