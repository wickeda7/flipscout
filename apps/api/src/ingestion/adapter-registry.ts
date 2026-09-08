import type { RetailerSource } from "@flipscout/types";
import type { RetailerAdapter } from "./retailer-adapter.js";
import { MockRetailerAdapter } from "./mock-retailer-adapter.js";
import { HttpJsonAdapter } from "./http-json-adapter.js";
import { ConnectorError, loadSources, readiness } from "./http-config.js";

export function getRetailerAdapter(source: RetailerSource): RetailerAdapter {
  if (source === "mock") return new MockRetailerAdapter();
  const config = loadSources().find(c => c.source === source);
  if (!config) throw new ConnectorError("SOURCE_NOT_CONFIGURED");
  if (readiness(config) !== "ready") throw new ConnectorError("SOURCE_NOT_READY");
  return new HttpJsonAdapter(config);
}
export function listRetailerAdapters(): RetailerAdapter[] {
  return [new MockRetailerAdapter(), ...loadSources().filter(c => readiness(c) === "ready").map(c => new HttpJsonAdapter(c))];
}
