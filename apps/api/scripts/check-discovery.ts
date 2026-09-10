import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { requestSerpApi } from "../src/retailers/serpapi-request.js";
import { normalizeDiscovery } from "../src/retailers/home-depot-discovery.js";
import { ConnectorError } from "../src/ingestion/http-config.js";

config({path:process.env.FLIPSCOUT_ENV_FILE??fileURLToPath(new URL("../.env",import.meta.url))});
const started=Date.now();
// Exactly one documented search request; no retries, no automatic five-group scan.
try {
  if(process.argv.length>2)throw new ConnectorError("DISCOVERY_CHECK_TAKES_NO_ARGUMENTS");
  const raw=await requestSerpApi({engine:"home_depot",q:"tools",store_id:"6305",delivery_zip:"33511",ps:"24",nao:"0"});
  const result=normalizeDiscovery(raw,{retailer:"home-depot",category:"tools",kind:"all",page:1});
  console.log(JSON.stringify({status:"success",checkedAt:new Date().toISOString(),durationMs:Date.now()-started,
    storeId:result.storeId,zip:result.zip,productsChecked:result.productsChecked,deals:result.deals,
    providerCreatedAt:result.providerCreatedAt},null,2));
} catch(error) {
  console.log(JSON.stringify({status:"failed",checkedAt:new Date().toISOString(),durationMs:Date.now()-started,
    code:error instanceof ConnectorError?error.code:"DISCOVERY_CHECK_FAILED"}));
  process.exitCode=1;
}
