import type { DiscoveryQuery, DiscoveryResponse, DiscoveredDeal } from '@flipscout/types';
import { requestSerpApi } from './serpapi-request.js';
import { distanceMiles, locateZip } from './discovery-location.js';
import { ConnectorError } from '../ingestion/http-config.js';
import { RequestError } from '../security/request-error.js';
import stores from './walmart-stores.json';

export async function resolveWalmartStore(zip: string) {
	const origin = await locateZip(zip);
	// Coordinates represent postal areas, not surveyed store entrances.
	return nearestWalmartStore(origin);
}
export function nearestWalmartStore(origin: { latitude: number; longitude: number }) {
	return stores
		.map((store) => ({ ...store, distanceMiles: distanceMiles(origin, store) }))
		.sort((a, b) => a.distanceMiles - b.distanceMiles || a.id.localeCompare(b.id))[0];
}
const itemId = (value: unknown): string | null =>
	typeof value === 'string' && /^\d+$/.test(value)
		? value
		: typeof value === 'number' && Number.isSafeInteger(value) && value > 0
			? String(value)
			: null;
const amount = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
const walmartSeller = (value: unknown) => typeof value === 'string' && /^(walmart|walmart\.com)$/i.test(value.trim());
function context(raw: any, engine: string, store: string) {
	if (raw?.error || raw?.search_metadata?.status !== 'Success') throw new ConnectorError('WALMART_PROVIDER_FAILED');
	if (
		raw?.search_parameters?.engine !== engine ||
		String(raw?.search_parameters?.store_id) !== store ||
		String(raw?.search_information?.location?.store_id) !== store
	)
		throw new ConnectorError('WALMART_CONTEXT_MISMATCH');
}
export function verifiedWalmartDeal(raw: any, candidate: any, store: string): DiscoveredDeal | null {
	context(raw, 'walmart_product', store);
	const p = raw.product_result,
		id = itemId(candidate.us_item_id);
	if (!id || itemId(p?.us_item_id) !== id || String(raw.search_parameters.product_id) !== id) return null;
	if (
		!walmartSeller(p.seller_name) ||
		!walmartSeller(candidate.seller_name) ||
		!p.seller_id ||
		String(p.seller_id) !== String(candidate.seller_id)
	)
		return null;
	const price = amount(p.price_map?.price),
		was = amount(p.price_map?.was_price?.price);
	if (
		p.price_map?.currency !== 'USD' ||
		!price ||
		!was ||
		was <= price ||
		p.in_stock === false ||
		typeof p.title !== 'string' ||
		!p.title.trim()
	)
		return null;
	if (p.price_map.was_price.currencyUnit && p.price_map.was_price.currencyUnit !== 'USD') return null;
	const variants = Array.isArray(p.variants)
		? p.variants.filter((v: unknown): v is string => typeof v === 'string')
		: [];
	const image = Array.isArray(p.images)
		? p.images.find((v: unknown) => typeof v === 'string' && /^https:\/\/i5\.walmartimages\.com\//.test(v))
		: null;
	return {
		id: `walmart-${id}`,
		title: p.title,
		price,
		originalPrice: was,
		savings: Math.round((was - price) * 100) / 100,
		kind: price === 0.01 ? 'penny' : 'sale',
		promotion: null,
		productUrl: `https://www.walmart.com/ip/${id}`,
		imageUrl: image ?? null,
		quantity: null,
		pickupStatus: 'unknown',
		pickupText: null,
		verification: {
			itemId: id,
			seller: p.seller_name,
			variants,
			checkedAt: new Date().toISOString(),
			pickup: typeof p.pickup_option?.available === 'boolean' ? p.pickup_option.available : null,
			shipping: typeof p.shipping_option?.available === 'boolean' ? p.shipping_option.available : null,
		},
	};
}
export async function discoverWalmart(
	query: DiscoveryQuery,
	request: typeof requestSerpApi = requestSerpApi,
	resolve = resolveWalmartStore,
): Promise<DiscoveryResponse> {
	const zip = query.zip ?? '33511';
	if (
		!/^\d{5}$/.test(zip) ||
		!Number.isInteger(query.page) ||
		query.page < 1 ||
		query.page > 10 ||
		query.category !== 'all'
	)
		throw new RequestError('Invalid Walmart search.', 400, 'INVALID_DISCOVERY_QUERY');
	const store = await resolve(zip);
	if (!store) throw new ConnectorError('WALMART_STORE_UNAVAILABLE');
	const result: DiscoveryResponse = {
		source: 'serpapi-walmart',
		retailer: 'Walmart',
		storeId: store.id,
		storeName: store.address,
		zip,
		offerScope: 'store-context',
		query,
		fetchedAt: new Date().toISOString(),
		providerCreatedAt: null,
		location: {
			zip,
			radiusMiles: query.radiusMiles ?? 25,
			distanceMiles: store.distanceMiles,
			covered: store.distanceMiles <= (query.radiusMiles ?? 25),
		},
		deals: [],
		productsChecked: 0,
		skippedProducts: 0,
		hasMore: false,
	};
	if (!result.location!.covered) return result;
	const raw: any = await request({
		engine: 'walmart',
		query: 'clearance',
		store_id: store.id,
		page: String(query.page),
	});
	context(raw, 'walmart', store.id);
	if (
		raw.search_parameters.query !== 'clearance' ||
		Number(raw.search_parameters.page ?? 1) !== query.page ||
		!Array.isArray(raw.organic_results)
	)
		throw new ConnectorError('WALMART_CONTEXT_MISMATCH');
	result.productsChecked = raw.organic_results.length;
	const seen = new Set<string>();
	const candidates = raw.organic_results.filter((p: any) => {
		const id = itemId(p?.us_item_id),
			price = amount(p?.primary_offer?.offer_price),
			was = amount(p?.primary_offer?.was_price);
		if (!id || seen.has(id) || !walmartSeller(p.seller_name) || !price || !was || was <= price) return false;
		seen.add(id);
		return true;
	});
	// Bound paid requests and latency. Omitted/unavailable candidates are explicitly reported.
	const selected = candidates.slice(0, 40),
		deadline = Date.now() + 240000;
	let cursor = 0,
		completed = 0,
		failures = 0;
	await Promise.all(
		Array.from({ length: Math.min(4, selected.length) }, async () => {
			while (cursor < selected.length && Date.now() < deadline) {
				const index = cursor++,
					candidate = selected[index];
				try {
					const detail = await request({
						engine: 'walmart_product',
						product_id: itemId(candidate.us_item_id)!,
						store_id: store.id,
					});
					const deal = verifiedWalmartDeal(detail, candidate, store.id);
					completed++;
					if (deal) result.deals.push(deal);
				} catch {
					failures++;
				}
			}
		}),
	);
	if (selected.length && !completed && failures) throw new ConnectorError('WALMART_VERIFICATION_UNAVAILABLE');
	result.coverage = { completed, failed: candidates.length - completed, total: candidates.length };
	result.deals.sort((a, b) => a.id.localeCompare(b.id));
	result.skippedProducts = result.productsChecked - result.deals.length;
	result.hasMore = Boolean(raw.serpapi_pagination?.next || raw.serpapi_pagination?.next_link) && query.page < 10;
	return result;
}
