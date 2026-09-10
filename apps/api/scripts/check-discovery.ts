import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createDatabaseDiscovery } from "../src/retailers/discovery-cache.js";
import { ConnectorError } from "../src/ingestion/http-config.js";

config({path:process.env.FLIPSCOUT_ENV_FILE??fileURLToPath(new URL("../.env",import.meta.url))});
const started=Date.now();
const service=createDatabaseDiscovery();
// Cache-aware single-group check; no automatic five-group scan.
try {
  if(process.argv.length>2)throw new ConnectorError("DISCOVERY_CHECK_TAKES_NO_ARGUMENTS");
  const result=await service.search({retailer:"home-depot",category:"tools",kind:"all",page:1,zip:"33511",radiusMiles:25});
  console.log(JSON.stringify({status:"success",checkedAt:new Date().toISOString(),durationMs:Date.now()-started,
    storeId:result.storeId,zip:result.zip,productsChecked:result.productsChecked,deals:result.deals,
    providerCreatedAt:result.providerCreatedAt,cache:result.cache},null,2));
} catch(error) {
  console.log(JSON.stringify({status:"failed",checkedAt:new Date().toISOString(),durationMs:Date.now()-started,
    code:error instanceof ConnectorError?error.code:"DISCOVERY_CHECK_FAILED"}));
  process.exitCode=1;
} finally {await service.close();}
