import { ConnectorError } from "../ingestion/http-config.js";
import { RequestError } from "../security/request-error.js";

/** Resolve the state instead of guessing it or letting ambiguous ZIP names win. */
export async function shoppingLocation(zip: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!/^\d{5}$/.test(zip)) throw new RequestError("Enter a five-digit ZIP code.", 400, "INVALID_ZIP");
  try {
    const response = await fetcher(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (response.status === 404) throw new RequestError("ZIP code was not found.", 400, "ZIP_NOT_FOUND");
    if (!response.ok) throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
    const raw = await response.json(), state = raw?.places?.[0]?.state;
    if (raw?.["post code"] !== zip || raw?.["country abbreviation"] !== "US" ||
        typeof state !== "string" || !/^[A-Za-z ]{2,60}$/.test(state) || !state.trim())
      throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
    return `${zip},${state.trim()},United States`;
  } catch (error) {
    if (error instanceof RequestError || error instanceof ConnectorError) throw error;
    throw new ConnectorError("ZIP_LOOKUP_UNAVAILABLE");
  }
}
