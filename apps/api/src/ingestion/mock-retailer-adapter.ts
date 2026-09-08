import type {
  RetailerIngestionBatch,
  RetailerSourceDeal,
  RetailerSourceStore,
} from "@flipscout/types";
import type { RetailerAdapter } from "./retailer-adapter.js";

const stores: RetailerSourceStore[] = [
  {
    source: "mock",
    externalStoreId: "hd-lake-mary-0279",
    retailer: "Home Depot",
    storeName: "Home Depot Lake Mary #0279",
    city: "Lake Mary",
    state: "FL",
    latitude: 28.7589,
    longitude: -81.3178,
  },
  {
    source: "mock",
    externalStoreId: "lowes-sanford-1641",
    retailer: "Lowe's",
    storeName: "Lowe's Sanford #1641",
    city: "Sanford",
    state: "FL",
    latitude: 28.8022,
    longitude: -81.2731,
  },
];

const deals: RetailerSourceDeal[] = [
  {
    source: "mock",
    externalDealId: "dewalt-impact-demo",
    externalStoreId: "hd-lake-mary-0279",
    productName: "DEWALT 20V MAX Impact Driver",
    brand: "DEWALT",
    category: "Tools",
    retailPrice: 179,
    clearancePrice: 49,
    resalePrice: 119,
    marketplaceFeePercent: 13.25,
    shippingCost: 10,
    otherCosts: 0,
    inventory: 6,
    sourceUpdatedAt: new Date().toISOString(),
    sku: "DCK-DEMO-001",
  },
  {
    source: "mock",
    externalDealId: "milwaukee-battery-demo",
    externalStoreId: "lowes-sanford-1641",
    productName: "Milwaukee M18 Battery",
    brand: "Milwaukee",
    category: "Tools",
    retailPrice: 149,
    clearancePrice: 39,
    resalePrice: 94,
    marketplaceFeePercent: 13.25,
    shippingCost: 10,
    otherCosts: 0,
    inventory: 4,
    sourceUpdatedAt: new Date().toISOString(),
    sku: "M18-DEMO-001",
  },
];

export class MockRetailerAdapter implements RetailerAdapter {
  readonly source = "mock" as const;

  async fetchBatch(): Promise<RetailerIngestionBatch> {
    return {
      source: this.source,
      stores,
      deals,
      fetchedAt: new Date().toISOString(),
      fullSnapshot: true,
    };
  }
}
