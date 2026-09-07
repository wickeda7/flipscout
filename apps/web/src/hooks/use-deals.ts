"use client";

import { useEffect, useState } from "react";
import type { Deal } from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      setDeals(await flipScoutApi.listDeals());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load deals.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { deals, loading, error, refresh };
}
