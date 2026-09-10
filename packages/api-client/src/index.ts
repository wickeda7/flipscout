import type {
  DiscoveryQuery, DiscoveryResponse,
  RetailerAvailabilityResponse,
  StoreInventoryQuery,
  StoreInventoryResponse,
  StoreSearchQuery,
  StoreSearchResponse,
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  Deal,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  IngestionRunSummary,
  IngestionStatusResponse,
  OptimizeRouteRequest,
  OptimizeRouteResponse,
  RegisterRequest,
  ResetPasswordRequest,
  ResendVerificationResponse,
  UpdateProfileRequest,
  VerificationResponse,
  VerifyEmailRequest,
  WatchlistResponse,
} from "@flipscout/types";

export interface FlipScoutApiClientOptions {
  baseUrl: string;
}

export class FlipScoutApiClient {
  private readonly baseUrl: string;
  private accessToken: string | null = null;

  constructor({ baseUrl }: FlipScoutApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  async getStoreInventory(id: string, query: StoreInventoryQuery = {}, signal?: AbortSignal): Promise<StoreInventoryResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key === "latitude" ? "lat" : key === "longitude" ? "lng" : key, String(value));
    }
    return this.request<StoreInventoryResponse>(`/v1/stores/${encodeURIComponent(id)}/deals?${params}`, { signal });
  }

  async searchStores(query: StoreSearchQuery = {}, signal?: AbortSignal): Promise<StoreSearchResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key === "latitude" ? "lat" : key === "longitude" ? "lng" : key, String(value));
    }
    return this.request<StoreSearchResponse>(`/v1/stores?${params}`, { signal });
  }

  async listDeals(query: {
    q?: string;
    retailer?: string;
    category?: string;
    source?: string;
    latitude?: number;
    longitude?: number;
  } = {}): Promise<Deal[]> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.retailer) params.set("retailer", query.retailer);
    if (query.category) params.set("category", query.category);
    if (query.source) params.set("source", query.source);
    if (query.latitude !== undefined) params.set("lat", String(query.latitude));
    if (query.longitude !== undefined) params.set("lng", String(query.longitude));

    const suffix = params.size ? `?${params.toString()}` : "";
    return this.request<Deal[]>(`/v1/deals${suffix}`);
  }


  async getIngestionStatus(): Promise<IngestionStatusResponse> {
    return this.request<IngestionStatusResponse>("/v1/ingestion/status");
  }

  async listIngestionRuns(limit = 20): Promise<IngestionRunSummary[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await this.request<{ runs: IngestionRunSummary[] }>(
      `/v1/ingestion/runs?${params.toString()}`,
    );
    return response.runs;
  }

  async getDeal(id: string): Promise<Deal | null> {
    const response = await fetch(
      `${this.baseUrl}/v1/deals/${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        headers: this.authHeaders(),
      },
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw await this.responseError(response);
    }

    return (await response.json()) as Deal;
  }

  async register(input: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }



  async verifyEmail(input: VerifyEmailRequest): Promise<VerificationResponse> {
    return this.request<VerificationResponse>("/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async resendVerification(): Promise<ResendVerificationResponse> {
    return this.request<ResendVerificationResponse>(
      "/v1/auth/resend-verification",
      { method: "POST" },
    );
  }

  async forgotPassword(
    input: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>("/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async resetPassword(input: ResetPasswordRequest): Promise<void> {
    await this.request<{ ok: true }>("/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async me(): Promise<{ user: AuthUser }> {
    return this.request<{ user: AuthUser }>("/v1/auth/me");
  }

  async logout(): Promise<void> {
    await this.request<{ ok: true }>("/v1/auth/logout", {
      method: "POST",
    });
  }


  async updateProfile(input: UpdateProfileRequest): Promise<{ user: AuthUser }> {
    return this.request<{ user: AuthUser }>("/v1/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async changePassword(input: ChangePasswordRequest): Promise<void> {
    await this.request<{ ok: true; sessionsRevoked: true }>(
      "/v1/account/password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
  }

  async logoutAll(): Promise<void> {
    await this.request<{ ok: true }>("/v1/account/logout-all", {
      method: "POST",
    });
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

  async getBestBuyAvailability(zip: string, sku: string, signal?: AbortSignal): Promise<RetailerAvailabilityResponse> {
    return this.request<RetailerAvailabilityResponse>(`/v1/retailers/bestbuy/availability?${new URLSearchParams({zip, sku})}`, { signal });
  }

  async discoverHomeDepot(query: DiscoveryQuery, signal?: AbortSignal): Promise<DiscoveryResponse> {
    return this.discoverDeals({...query,retailer:"home-depot"},signal);
  }

  async discoverDeals(query: DiscoveryQuery, signal?: AbortSignal): Promise<DiscoveryResponse> {
    return this.request<DiscoveryResponse>(`/v1/discovery?${new URLSearchParams({...query.retryFailed?{retryFailed:"true"}:{},retailer:query.retailer??"home-depot",category:query.category,kind:query.kind,page:String(query.page),zip:query.zip??"33511",radiusMiles:String(query.radiusMiles??25)})}`,{signal});
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

  private authHeaders(): HeadersInit {
    return this.accessToken
      ? { Authorization: `Bearer ${this.accessToken}` }
      : {};
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw await this.responseError(response);
    }

    return (await response.json()) as T;
  }

  private async responseError(response: Response): Promise<Error> {
    const body = await response
      .json()
      .catch(() => ({ error: `Request failed (${response.status}).` }));

    const message =
      typeof body?.error === "string"
        ? body.error
        : `FlipScout API failed (${response.status}).`;

    const error = new Error(message) as Error & { code?: string };
    if (typeof body?.code === "string") error.code = body.code;
    return error;
  }
}
