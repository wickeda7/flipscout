import type { StoreSearchResponse } from "@flipscout/types";
import type { ResolvedStoreQuery } from "./query.js";
export interface StoreProvider { search(query: ResolvedStoreQuery): Promise<StoreSearchResponse> }
