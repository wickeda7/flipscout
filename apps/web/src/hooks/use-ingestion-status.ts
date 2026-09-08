"use client";

import { useCallback, useEffect, useState } from "react";
import type { IngestionStatusResponse } from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";

export function useIngestionStatus() {
  const [status, setStatus] = useState<IngestionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setStatus(await flipScoutApi.getIngestionStatus());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load data-source status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}
