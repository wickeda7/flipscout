import { ConnectorError } from "../ingestion/http-config.js";
/** Fixed provider host; never emit request URLs, credentials, or raw provider errors. */
export async function requestSerpApi(params: Record<string,string>, key = process.env.SERPAPI_API_KEY,
  fetcher: typeof fetch = fetch, timeoutMs = 105000): Promise<unknown> {
  if (!key?.trim()) throw new ConnectorError("SERPAPI_KEY_MISSING");
  const url = new URL("https://serpapi.com/search.json");
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  url.searchParams.set("api_key",key);
  const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response = await fetcher(url,{headers:{Accept:"application/json"},redirect:"error",signal:controller.signal});
    if (!response.ok) { await response.body?.cancel(); throw new ConnectorError(`SERPAPI_HTTP_${response.status}`); }
    if (!/application\/(?:[a-z0-9.+-]*\+)?json\b/i.test(response.headers.get("content-type")??"") || !response.body)
      throw new ConnectorError("INVALID_PROVIDER_RESPONSE");
    const reader=response.body.getReader(), chunks:Uint8Array[]=[];let size=0;
    try { while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>4000000)throw new ConnectorError("PROVIDER_RESPONSE_TOO_LARGE");chunks.push(value);} }
    finally {await reader.cancel().catch(()=>undefined);}
    try {return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
    catch {throw new ConnectorError("INVALID_PROVIDER_JSON");}
  } catch(e) {
    if(e instanceof ConnectorError)throw e;
    throw new ConnectorError(controller.signal.aborted?"SERPAPI_TIMEOUT":"SERPAPI_NETWORK_ERROR");
  } finally {clearTimeout(timer);}
}
