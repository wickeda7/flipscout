import type { Deal } from "@flipscout/types";

export interface DealQuery {
  storeId?: string;
  limit?: number;
  offset?: number;
  q?: string;
  retailer?: string;
  category?: string;
  source?: string;
  originLatitude?: number;
  originLongitude?: number;
}

export interface DealProvider {
  listDeals(query?: DealQuery): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | null>;
  health?(): Promise<{ ok: boolean; detail?: string }>;
}
