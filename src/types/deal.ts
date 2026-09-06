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
  retailPrice: number;
  clearancePrice: number;
  resalePrice: number;
  estimatedProfit: number;
  roi: number;
  inventory: number;
  buyScore: number;
  status: DealStatus;
  category: string;
  updatedMinutesAgo: number;
}
