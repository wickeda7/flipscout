export type DealStatus = "strong-buy" | "buy" | "maybe" | "skip";

export interface Deal {
  id: string;
  productName: string;
  brand: string;
  retailer: string;
  storeName: string;
  city: string;
  state: string;
  distanceMiles: number;
  latitude: number;
  longitude: number;
  retailPrice: number;
  clearancePrice: number;
  resalePrice: number;
  marketplaceFeePercent: number;
  shippingCost: number;
  otherCosts: number;
  estimatedProfit: number;
  roi: number;
  margin: number;
  breakEvenPrice: number;
  inventory: number;
  buyScore: number;
  status: DealStatus;
  category: string;
  updatedMinutesAgo: number;
  source?: RetailerSource;
  sourceUrl?: string | null;
  sku?: string | null;
  upc?: string | null;
  isActive?: boolean;
}

export interface StoreRouteInput {
  key: string;
  storeName: string;
  latitude: number;
  longitude: number;
}

export interface OptimizeRouteRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  stores: StoreRouteInput[];
}

export interface OptimizeRouteResponse {
  provider: "mapbox";
  orderedStoreKeys: string[];
  distanceMiles: number;
  durationMinutes: number;
  legs: Array<{
    index: number;
    distanceMiles: number;
    durationMinutes: number;
  }>;
  geometry: [number, number][];
}


export interface WatchlistItem {
  dealId: string;
  createdAt: string;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
}


export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  verificationEmailSent?: boolean;
  developmentVerificationUrl?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}


export interface UpdateProfileRequest {
  displayName?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}


export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  ok: true;
  /**
   * Development-only reset URL. Production deployments should deliver this
   * through the configured email provider and omit it from the API response.
   */
  developmentResetUrl?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}


export interface VerifyEmailRequest {
  token: string;
}

export interface VerificationResponse {
  ok: true;
  user: AuthUser;
}

export interface ResendVerificationResponse {
  ok: true;
  alreadyVerified: boolean;
  emailSent?: boolean;
  developmentVerificationUrl?: string;
}


export type RetailerSource =
  | "home-depot"
  | "lowes"
  | "walmart"
  | "target"
  | "costco"
  | "dollar-general"
  | "mock"
  | (string & {});

export interface RetailerSourceStore {
  source: RetailerSource;
  externalStoreId: string;
  retailer: string;
  storeName: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface RetailerSourceDeal {
  source: RetailerSource;
  externalDealId: string;
  externalStoreId: string;
  productName: string;
  brand: string;
  category: string;
  retailPrice: number;
  clearancePrice: number;
  resalePrice?: number;
  marketplaceFeePercent?: number;
  shippingCost?: number;
  otherCosts?: number;
  inventory: number;
  sourceUpdatedAt: string;
  sourceUrl?: string;
  sku?: string;
  upc?: string;
}

export interface RetailerIngestionBatch {
  source: RetailerSource;
  stores: RetailerSourceStore[];
  deals: RetailerSourceDeal[];
  fetchedAt: string;
  /**
   * True only when the batch represents the complete known inventory for
   * this source. Partial/paginated batches must set this to false.
   */
  fullSnapshot: boolean;
}

export interface RetailerIngestionResult {
  source: RetailerSource;
  storesUpserted: number;
  dealsUpserted: number;
  dealsSkipped: number;
  startedAt: string;
  completedAt: string;
}


export type IngestionRunStatus = "completed" | "failed";

export interface IngestionRunSummary {
  id: string;
  source: RetailerSource;
  status: IngestionRunStatus;
  fetchedAt: string | null;
  storesUpserted: number;
  dealsUpserted: number;
  dealsSkipped: number;
  startedAt: string;
  completedAt: string;
  errorMessage: string | null;
}

export interface IngestionSourceStatus {
  source: RetailerSource;
  activeDeals: number;
  inactiveDeals: number;
  stores: number;
  lastSeenAt: string | null;
  latestRun: IngestionRunSummary | null;
  freshness: "fresh" | "aging" | "stale" | "unknown";
}

export interface IngestionStatusResponse {
  generatedAt: string;
  staleAfterMinutes: number;
  sources: IngestionSourceStatus[];
}
