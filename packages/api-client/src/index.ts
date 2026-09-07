import type {
  Deal,
  OptimizeRouteRequest,
  OptimizeRouteResponse,
} from "@flipscout/types";

export interface FlipScoutApiClientOptions {
  baseUrl: string;
}

export class FlipScoutApiClient {
  private readonly baseUrl: string;

  constructor({ baseUrl }: FlipScoutApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async listDeals(): Promise<Deal[]> {
    return this.request<Deal[]>("/v1/deals");
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
}
