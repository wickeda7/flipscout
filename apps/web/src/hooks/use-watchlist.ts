"use client";

import { useCallback, useEffect, useState } from "react";
import { flipScoutApi } from "@/lib/api";

const CHANGE_EVENT = "flipscout-watchlist-change";

export function useWatchlist() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const response = await flipScoutApi.getWatchlist();
      setSavedIds(response.items.map((item) => item.dealId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load watchlist.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const sync = () => void refresh();
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, [refresh]);

  const notifyChange = useCallback(() => {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const isSaved = useCallback(
    (dealId: string) => savedIds.includes(dealId),
    [savedIds],
  );

  const toggle = useCallback(
    async (dealId: string) => {
      const saved = savedIds.includes(dealId);

      // Optimistic update keeps the button responsive.
      setSavedIds((current) =>
        saved
          ? current.filter((id) => id !== dealId)
          : [...current, dealId],
      );

      try {
        setError(null);
        if (saved) {
          await flipScoutApi.removeFromWatchlist(dealId);
        } else {
          await flipScoutApi.addToWatchlist(dealId);
        }
        notifyChange();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to update watchlist.",
        );
        await refresh();
      }
    },
    [notifyChange, refresh, savedIds],
  );

  const remove = useCallback(
    async (dealId: string) => {
      setSavedIds((current) => current.filter((id) => id !== dealId));

      try {
        setError(null);
        await flipScoutApi.removeFromWatchlist(dealId);
        notifyChange();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to update watchlist.",
        );
        await refresh();
      }
    },
    [notifyChange, refresh],
  );

  const clear = useCallback(async () => {
    const previous = savedIds;
    setSavedIds([]);

    try {
      setError(null);
      await flipScoutApi.clearWatchlist();
      notifyChange();
    } catch (cause) {
      setSavedIds(previous);
      setError(
        cause instanceof Error ? cause.message : "Unable to clear watchlist.",
      );
    }
  }, [notifyChange, savedIds]);

  return {
    savedIds,
    isSaved,
    toggle,
    remove,
    clear,
    refresh,
    loading,
    error,
    count: savedIds.length,
  };
}
