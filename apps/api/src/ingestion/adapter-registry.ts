import type { RetailerSource } from "@flipscout/types";
import type { RetailerAdapter } from "./retailer-adapter.js";
import { MockRetailerAdapter } from "./mock-retailer-adapter.js";

const adapters: RetailerAdapter[] = [
  new MockRetailerAdapter(),
];

export function getRetailerAdapter(
  source: RetailerSource,
): RetailerAdapter {
  const adapter = adapters.find((candidate) => candidate.source === source);

  if (!adapter) {
    throw new Error(
      `No retailer adapter is configured for source "${source}".`,
    );
  }

  return adapter;
}

export function listRetailerAdapters(): RetailerAdapter[] {
  return [...adapters];
}
