import { config } from "dotenv";
import { fetchHomeDepotPilot, validatePilotQuery } from "../src/retailers/home-depot-pilot.js";
import { ConnectorError } from "../src/ingestion/http-config.js";
// Optional path supports the user's separate checkout without copying credentials.
config({ path: process.env.FLIPSCOUT_ENV_FILE ?? new URL("../.env",import.meta.url).pathname });
try {
  const ids = process.argv.slice(2);
  if (ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length)
    throw new ConnectorError("SUPPLY_1_TO_5_UNIQUE_HOME_DEPOT_PRODUCT_IDS");
  const queries = ids.map(productId => ({ productId, storeId: "6305", zip: "33511" }));
  queries.forEach(validatePilotQuery);
  if (!process.env.SERPAPI_API_KEY?.trim()) throw new ConnectorError("SERPAPI_KEY_MISSING");
  for (const query of queries) {
    try { console.log(JSON.stringify(await fetchHomeDepotPilot(query),null,2)); }
    catch (error) {
      const code = error instanceof ConnectorError ? error.code : "PILOT_FAILED";
      console.error(JSON.stringify({ ...query, status: "failed", code })); process.exitCode = 1;
      // Stop this small paid probe on failure; do not burn remaining queries.
      break;
    }
  }
} catch (error) {
  console.error(error instanceof ConnectorError ? error.code : "PILOT_FAILED"); process.exitCode = 1;
}
