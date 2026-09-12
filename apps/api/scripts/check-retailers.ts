import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { discoveryRetailers } from "@flipscout/types";
import { createDatabaseDiscovery } from "../src/retailers/discovery-cache.js";
import { ConnectorError } from "../src/ingestion/http-config.js";
import { RequestError } from "../src/security/request-error.js";

config({ path: process.env.FLIPSCOUT_ENV_FILE ?? fileURLToPath(new URL("../.env", import.meta.url)) });
const selection = process.argv[2], zip = process.argv[3] ?? "33511";
if (!selection || process.argv.length > 4 || !/^\d{5}$/.test(zip) ||
    (selection !== "all" && !discoveryRetailers.some(r => r.id === selection))) {
  console.error("Usage: yarn check:retailers <retailer-id|all> [ZIP]");
  process.exitCode = 1;
} else {
  const service = createDatabaseDiscovery();
  const retailers = discoveryRetailers.filter(r => selection === "all" || selection === r.id);
  let next = 0;
  async function worker() {
    while (next < retailers.length) {
      const retailer = retailers[next++]; const started = Date.now();
      try {
        const query = { retailer: retailer.id, zip, category: "all", kind: "all", page: 1, radiusMiles: 25 } as const;
        const first = await service.search(query);
        const second = await service.search(query);
        const cacheVerified = second.cache?.source === "database" && first.cache?.expiresAt === second.cache?.expiresAt;
        console.log(JSON.stringify({ retailer: retailer.id, zip, status: first.coverage?.failed ? "partial" : "success",
          source: first.source, deals: first.deals.length, productsChecked: first.productsChecked,
          diagnostics: first.diagnostics, cache: first.cache, cacheVerified, durationMs: Date.now() - started }));
        if (!cacheVerified || first.coverage?.failed) process.exitCode = process.exitCode === 1 ? 1 : 2;
      } catch (error) {
        console.log(JSON.stringify({ retailer: retailer.id, zip, status: "failed", durationMs: Date.now() - started,
          code: error instanceof ConnectorError || error instanceof RequestError ? error.code : "DISCOVERY_CHECK_FAILED" }));
        process.exitCode = 1;
      }
    }
  }
  try { await Promise.all([worker(), worker()]); } finally { await service.close(); }
}
