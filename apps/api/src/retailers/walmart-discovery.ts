import type { DiscoveryQuery } from '@flipscout/types';
import { discoverShopping } from './shopping-discovery.js';
import { requestSerpApi } from './serpapi-request.js';
import { shoppingLocation } from './shopping-location.js';

/** ZIP-aware online offers. No fixed store or inferred shelf inventory. */
export function discoverWalmart(
	query: DiscoveryQuery,
	request: typeof requestSerpApi = requestSerpApi,
	resolveLocation: typeof shoppingLocation = shoppingLocation,
) {
	return discoverShopping({ ...query, retailer: 'walmart' }, request, resolveLocation);
}
