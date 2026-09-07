"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "flipscout-watchlist";
const CHANGE_EVENT = "flipscout-watchlist-change";

function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWatchlist() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSavedIds(readSavedIds());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const isSaved = useCallback(
    (dealId: string) => savedIds.includes(dealId),
    [savedIds],
  );

  const toggle = useCallback((dealId: string) => {
    const current = readSavedIds();
    const next = current.includes(dealId)
      ? current.filter((id) => id !== dealId)
      : [...current, dealId];

    writeSavedIds(next);
  }, []);

  const remove = useCallback((dealId: string) => {
    writeSavedIds(readSavedIds().filter((id) => id !== dealId));
  }, []);

  const clear = useCallback(() => {
    writeSavedIds([]);
  }, []);

  return {
    savedIds,
    isSaved,
    toggle,
    remove,
    clear,
    count: savedIds.length,
  };
}
