import type { DiscoveryQuery, DiscoveryResponse, DiscoveredDeal } from '@flipscout/types';
import { HomeDepotDiscovery } from './home-depot-discovery.js';
import { normalizeHomeDepotPilot } from './home-depot-pilot.js';
import { requestSerpApi } from './serpapi-request.js';
import { ConnectorError } from '../ingestion/http-config.js';

export function verifyHomeDepotDeal(
	raw: any,
	candidate: DiscoveredDeal,
	result: DiscoveryResponse,
): DiscoveredDeal | null {
	if (raw?.search_parameters?.engine !== 'home_depot_product') throw new ConnectorError('SEARCH_CONTEXT_MISMATCH');
	const detail = normalizeHomeDepotPilot(raw, { productId: candidate.id, storeId: result.storeId!, zip: result.zip });
	const p = raw.product_results,
		price = detail.reportedPrice;
	const original =
		typeof p.promotion?.original === 'number' && Number.isFinite(p.promotion.original) ? p.promotion.original : null;
	if (price === null || price <= 0) return null;
	const sale = original !== null && original > price;
	// Search badges do not prove that a product is still discounted.
	if (!sale && price !== 0.01) return null;
	const options = Array.isArray(p.fulfillment?.options) ? p.fulfillment.options : [];
	const availability = (type: string): boolean | null => {
		const rows = options.filter((o: any) => o?.type === type);
		return rows.length === 1 && Number.isSafeInteger(rows[0].quantity) && rows[0].quantity >= 0
			? rows[0].quantity > 0
			: null;
	};
	const sameStore = typeof result.storeName === 'string' && detail.reportedFulfillmentStore === result.storeName;
	return {
		...candidate,
		title: detail.productName,
		price,
		originalPrice: sale ? original : null,
		savings: sale ? Math.round((original! - price) * 100) / 100 : null,
		kind: price === 0.01 ? 'penny' : 'sale',
		promotion: null,
		productUrl: `https://www.homedepot.com/p/${candidate.id}`,
		quantity: null,
		pickupStatus: 'unknown',
		pickupText: null,
		verification: {
			itemId: candidate.id,
			seller: 'Home Depot',
			variants: typeof p.model_number === 'string' ? [p.model_number] : [],
			checkedAt: detail.fetchedAt,
			pickup: sameStore ? availability('Store Pickup') : null,
			shipping: availability('Ship to Home'),
		},
	};
}

export async function discoverVerifiedHomeDepot(
	query: DiscoveryQuery,
	request: typeof requestSerpApi = requestSerpApi,
	search: (q: DiscoveryQuery) => Promise<DiscoveryResponse> = (q) => new HomeDepotDiscovery(request).search(q),
) {
	const result = await search({ ...query, kind: 'all' });
	const candidates = result.deals;
	const selected = candidates.slice(0, 40),
		deadline = Date.now() + 240000;
	let cursor = 0,
		completed = 0;
	const verified: DiscoveredDeal[] = [];
	await Promise.all(
		Array.from({ length: Math.min(4, selected.length) }, async () => {
			while (cursor < selected.length && Date.now() < deadline) {
				const candidate = selected[cursor++];
				try {
					const raw = await request({
						engine: 'home_depot_product',
						product_id: candidate.id,
						store_id: result.storeId!,
						delivery_zip: result.zip,
					});
					const deal = verifyHomeDepotDeal(raw, candidate, result);
					completed++;
					if (deal) verified.push(deal);
				} catch {
					/* Only verified products can be displayed; failures are counted below. */
				}
			}
		}),
	);
	if (candidates.length && !completed) throw new ConnectorError('HOME_DEPOT_VERIFICATION_UNAVAILABLE');
	return {
		...result,
		offerScope: 'store-context' as const,
		deals: verified.sort((a, b) => a.id.localeCompare(b.id)),
		skippedProducts: result.skippedProducts + candidates.length - verified.length,
		verificationCoverage: { completed, failed: candidates.length - completed, total: candidates.length },
	};
}
