import type {
  Deal,
  OptimizeRouteRequest,
  OptimizeRouteResponse,
  WatchlistResponse,
} from "@flipscout/types";

export interface FlipScoutApiClientOptions {
  baseUrl: string;
}

export class FlipScoutApiClient {
  private readonly baseUrl: string;

  constructor({ baseUrl }: FlipScoutApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async listDeals(query: {
    q?: string;
    retailer?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
  } = {}): Promise<Deal[]> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.retailer) params.set("retailer", query.retailer);
    if (query.category) params.set("category", query.category);
    if (query.latitude !== undefined) params.set("lat", String(query.latitude));
    if (query.longitude !== undefined) params.set("lng", String(query.longitude));

    const suffix = params.size ? `?${params.toString()}` : "";
    return this.request<Deal[]>(`/v1/deals${suffix}`);
  }

  async getDeal(id: string): Promise<Deal | null> {
    const response = await fetch(
      `${this.baseUrl}/v1/deals/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`FlipScout API failed (${response.status}).`);
    }

    return (await response.json()) as Deal;
  }

  async optimizeRoute(
    payload: OptimizeRouteRequest,
  ): Promise<OptimizeRouteResponse> {
    return this.request<OptimizeRouteResponse>("/v1/routes/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ error: `Request failed (${response.status}).` }));

      throw new Error(
        typeof body?.error === "string"
          ? body.error
          : `FlipScout API failed (${response.status}).`,
      );
    }

    return (await response.json()) as T;
  }

  async getWatchlist(): Promise<WatchlistResponse> {
  return this.request<WatchlistResponse>("/v1/watchlist");
}

  async addToWatchlist(dealId: string): Promise<void> {
  await this.request<{ ok: true }>("/v1/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dealId }),
  });
}

  async removeFromWatchlist(dealId: string): Promise<void> {
  await this.request<{ ok: true }>(
    `/v1/watchlist/${encodeURIComponent(dealId)}`,
    { method: "DELETE" },
  );
}

  async clearWatchlist(): Promise<void> {
  await this.request<{ ok: true }>("/v1/watchlist", {
    method: "DELETE",
  });
}

}
