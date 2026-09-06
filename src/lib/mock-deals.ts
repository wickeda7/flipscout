import type { Deal, DealStatus } from "@/types/deal";
import { calculateProfit } from "@/lib/profit";
import { calculateBuyScore } from "@/lib/buy-score";

interface RawDeal {
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
  inventory: number;
  category: string;
  updatedMinutesAgo: number;
}

const rawDeals: RawDeal[] = [
  {
    id: "deal-001",
    productName: "20V MAX XR Brushless Impact Driver Kit",
    brand: "DEWALT",
    retailer: "Home Depot",
    storeName: "Lake Mary #0279",
    city: "Lake Mary",
    state: "FL",
    distanceMiles: 5.8,
    retailPrice: 179,
    clearancePrice: 49,
    resalePrice: 119,
    marketplaceFeePercent: 13.25,
    shippingCost: 10,
    otherCosts: 0,
    inventory: 6,
    category: "Tools",
    updatedMinutesAgo: 8,
  },
  {
    id: "deal-002",
    productName: "M18 REDLITHIUM XC 5.0Ah Battery",
    brand: "Milwaukee",
    retailer: "Lowe's",
    storeName: "Sanford #1641",
    city: "Sanford",
    state: "FL",
    distanceMiles: 9.2,
    retailPrice: 149,
    clearancePrice: 39,
    resalePrice: 94,
    marketplaceFeePercent: 13.25,
    shippingCost: 8,
    otherCosts: 0,
    inventory: 4,
    category: "Tools",
    updatedMinutesAgo: 12,
  },
  {
    id: "deal-003",
    productName: '27" QHD Gaming Monitor 165Hz',
    brand: "LG",
    retailer: "Walmart",
    storeName: "Sanford Supercenter #857",
    city: "Sanford",
    state: "FL",
    distanceMiles: 7.4,
    retailPrice: 249,
    clearancePrice: 119,
    resalePrice: 199,
    marketplaceFeePercent: 13.25,
    shippingCost: 25,
    otherCosts: 0,
    inventory: 3,
    category: "Electronics",
    updatedMinutesAgo: 21,
  },
  {
    id: "deal-004",
    productName: "Cordless Stick Vacuum",
    brand: "Shark",
    retailer: "Target",
    storeName: "Lake Mary",
    city: "Lake Mary",
    state: "FL",
    distanceMiles: 3.6,
    retailPrice: 299,
    clearancePrice: 104.99,
    resalePrice: 184,
    marketplaceFeePercent: 13.25,
    shippingCost: 22,
    otherCosts: 0,
    inventory: 2,
    category: "Home",
    updatedMinutesAgo: 34,
  },
  {
    id: "deal-005",
    productName: "12V MAX 2-Tool Combo Kit",
    brand: "Bosch",
    retailer: "Lowe's",
    storeName: "Altamonte Springs #0604",
    city: "Altamonte Springs",
    state: "FL",
    distanceMiles: 12.1,
    retailPrice: 159,
    clearancePrice: 35,
    resalePrice: 98,
    marketplaceFeePercent: 13.25,
    shippingCost: 8,
    otherCosts: 0,
    inventory: 8,
    category: "Tools",
    updatedMinutesAgo: 5,
  },
  {
    id: "deal-006",
    productName: "Smart Wi-Fi Air Fryer Pro",
    brand: "Cosori",
    retailer: "Walmart",
    storeName: "Casselberry Supercenter #943",
    city: "Casselberry",
    state: "FL",
    distanceMiles: 14.7,
    retailPrice: 129,
    clearancePrice: 49,
    resalePrice: 79,
    marketplaceFeePercent: 13.25,
    shippingCost: 13,
    otherCosts: 0,
    inventory: 7,
    category: "Kitchen",
    updatedMinutesAgo: 19,
  },
];

function toStatus(label: string): DealStatus {
  if (label === "STRONG BUY") return "strong-buy";
  if (label === "BUY") return "buy";
  if (label === "MAYBE") return "maybe";
  return "skip";
}

export const mockDeals: Deal[] = rawDeals.map((deal) => {
  const discountPercent =
    ((deal.retailPrice - deal.clearancePrice) / deal.retailPrice) * 100;

  const profit = calculateProfit({
    purchasePrice: deal.clearancePrice,
    resalePrice: deal.resalePrice,
    marketplaceFeePercent: deal.marketplaceFeePercent,
    shippingCost: deal.shippingCost,
    otherCosts: deal.otherCosts,
  });

  const buy = calculateBuyScore({
    roiPercent: profit.roiPercent,
    netProfit: profit.netProfit,
    discountPercent,
    inventory: deal.inventory,
    distanceMiles: deal.distanceMiles,
  });

  return {
    ...deal,
    estimatedProfit: profit.netProfit,
    roi: profit.roiPercent,
    margin: profit.marginPercent,
    breakEvenPrice: profit.breakEvenPrice,
    buyScore: buy.score,
    status: toStatus(buy.label),
  };
});

export const categories = [
  "All categories",
  "Tools",
  "Electronics",
  "Home",
  "Kitchen",
];

export const retailers = [
  "All stores",
  "Home Depot",
  "Lowe's",
  "Walmart",
  "Target",
];
