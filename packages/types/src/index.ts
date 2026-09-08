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
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
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
