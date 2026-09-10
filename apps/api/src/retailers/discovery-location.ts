import { ConnectorError } from "../ingestion/http-config.js";
import { RequestError } from "../security/request-error.js";

// Approximate store coordinates; source and precision documented in the checkpoint guide.
export const pilotStore = { latitude: 27.9395566635, longitude: -82.2619954134 };
export function distanceMiles(a: {latitude:number;longitude:number}, b=pilotStore): number {
  const rad=(n:number)=>n*Math.PI/180;
  const h=Math.sin(rad(b.latitude-a.latitude)/2)**2+
    Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-a.longitude)/2)**2;
  return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export async function locateZip(zip:string, fetcher:typeof fetch=fetch):Promise<{latitude:number;longitude:number}> {
  if(!/^\d{5}$/.test(zip))throw new RequestError("Enter a five-digit ZIP code.",400,"INVALID_ZIP");
  try {
    const response=await fetcher(`https://api.zippopotam.us/us/${zip}`,{signal:AbortSignal.timeout(8000),redirect:"error"});
    if(response.status===404)throw new RequestError("ZIP code was not found.",400,"ZIP_NOT_FOUND");
    if(!response.ok)throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
    const raw=await response.json();
    const place=raw?.places?.[0];
    if(raw?.["post code"]!==zip||raw?.["country abbreviation"]!=="US"||
      typeof place?.latitude!=="string"||!place.latitude.trim()||
      typeof place?.longitude!=="string"||!place.longitude.trim())throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
    const latitude=Number(place.latitude),longitude=Number(place.longitude);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)
      throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
    return {latitude,longitude};
  } catch(e) {
    if(e instanceof RequestError||e instanceof ConnectorError)throw e;
    throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
  }
}
