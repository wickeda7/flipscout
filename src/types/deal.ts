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
