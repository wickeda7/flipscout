import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { HomeDepotDiscovery } from "../src/retailers/home-depot-discovery.js";
import { ConnectorError } from "../src/ingestion/http-config.js";
config({path:process.env.FLIPSCOUT_ENV_FILE??fileURLToPath(new URL("../.env",import.meta.url))});
const started=Date.now();
try {
  if(process.argv.length>2)throw new ConnectorError("DISCOVERY_SCAN_TAKES_NO_ARGUMENTS");
  const result=await new HomeDepotDiscovery().search({retailer:"home-depot",category:"all",kind:"all",page:1,zip:"33511",radiusMiles:25});
  const status=result.coverage?.failed?"partial":"success";
  console.log(JSON.stringify({status,checkedAt:new Date().toISOString(),durationMs:Date.now()-started,result},null,2));
  if(status==="partial")process.exitCode=2;
} catch(error) {
  console.log(JSON.stringify({status:"failed",checkedAt:new Date().toISOString(),durationMs:Date.now()-started,
    code:error instanceof ConnectorError?error.code:"DISCOVERY_SCAN_FAILED"}));
  process.exitCode=1;
}
