import { searchDepartments, shoppingDepartments } from './department-search.js';
import type { DiscoveryQuery, DiscoveryResponse, DiscoveredDeal } from '@flipscout/types';
import { requestSerpApi } from './serpapi-request.js';
import { locateZip, distanceMiles } from './discovery-location.js';
import { ConnectorError } from '../ingestion/http-config.js';
import { RequestError } from '../security/request-error.js';

// Official store listing: https://www.target.com/sl/brandon/812
export async function targetLocation(zip: string) {
	const [origin, storeArea] = await Promise.all([locateZip(zip), locateZip('33511')]);
	return { id: '812', name: 'Brandon · 187 Brandon Town Center Dr', distance: distanceMiles(origin, storeArea) };
}
export function targetParams(query: DiscoveryQuery) {
	if (
		!/^\d{5}$/.test(query.zip ?? '33511') ||
		query.category !== 'all' ||
		!Number.isInteger(query.page) ||
		query.page < 1 ||
		query.page > 10
	)
		throw new RequestError('Invalid Target search.', 400, 'INVALID_DISCOVERY_QUERY');
	return {
		engine: 'target',
		q: 'clearance',
		store_id: '812',
		delivery_zip: query.zip ?? '33511',
		page: String(query.page),
	};
}
function price(text: unknown, value: unknown): number | null {
	if (
		typeof text !== 'string' ||
		!/^\$\d[\d,]*(?:\.\d{2})?$/.test(text.trim()) ||
		typeof value !== 'number' ||
		!Number.isFinite(value) ||
		value <= 0
	)
		return null;
	return Number(text.trim().replace(/[$,]/g, '')) === value ? value : null;
}
export function normalizeTarget(raw: any, query: DiscoveryQuery, term = 'clearance'): DiscoveryResponse {
	const params = { ...targetParams(query), q: term };
	if (raw?.error || raw?.search_metadata?.status !== 'Success') throw new ConnectorError('TARGET_PROVIDER_FAILED');
	for (const key of ['engine', 'q', 'store_id', 'delivery_zip', 'page'] as const) {
		if (String(raw.search_parameters?.[key] ?? (key === 'page' ? '1' : '')) !== params[key])
			throw new ConnectorError('TARGET_CONTEXT_MISMATCH');
	}
	if (!Array.isArray(raw.organic_results) || raw.organic_results.length > 100)
		throw new ConnectorError('TARGET_INVALID_RESPONSE');
	const deals: DiscoveredDeal[] = [],
		seen = new Set<string>();
	for (const p of raw.organic_results) {
		if (
			!p ||
			typeof p.tcin !== 'string' ||
			!/^\d+$/.test(p.tcin) ||
			seen.has(p.tcin) ||
			typeof p.title !== 'string' ||
			!p.title.trim()
		)
			continue;
		const current = price(p.price, p.extracted_price),
			old = price(p.old_price, p.extracted_old_price);
		if (current === null) continue;
		const sale = old !== null && old > current;
		const clearance = p.tag === 'Clearance';
		if (!sale && !clearance && current !== 0.01) continue;
		let url: URL;
		try {
			url = new URL(p.link);
		} catch {
			continue;
		}
		if (
			url.protocol !== 'https:' ||
			!['www.target.com', 'target.com'].includes(url.hostname) ||
			url.port ||
			url.username ||
			url.password
		)
			continue;
		const linkedId = url.pathname.match(/\/A-(\d+)$/)?.[1];
		if (linkedId !== p.tcin && !(linkedId === p.parent_tcin && url.searchParams.get('preselect') === p.tcin)) continue;
		let image: string | null = null;
		try {
			const u = new URL(p.thumbnail);
			if (u.protocol === 'https:' && u.hostname === 'target.scene7.com' && !u.port && !u.username && !u.password)
				image = u.href;
		} catch {}
		seen.add(p.tcin);
		deals.push({
			id: `target-${p.tcin}`,
			title: p.title,
			price: current,
			originalPrice: sale ? old : null,
			savings: sale ? Math.round((old! - current) * 100) / 100 : null,
			kind: current === 0.01 ? 'penny' : clearance ? 'clearance' : 'sale',
			promotion: typeof p.price_note === 'string' ? p.price_note : null,
			productUrl: url.href,
			imageUrl: image,
			quantity: null,
			pickupStatus: 'unknown',
			pickupText: null,
		});
	}
	return {
		source: 'serpapi-target',
		retailer: 'Target',
		storeId: '812',
		storeName: 'Brandon · 187 Brandon Town Center Dr',
		zip: params.delivery_zip,
		offerScope: 'store-context',
		query,
		fetchedAt: new Date().toISOString(),
		providerCreatedAt: null,
		deals,
		productsChecked: raw.organic_results.length,
		skippedProducts: raw.organic_results.length - deals.length,
		hasMore: query.page < 10 && Boolean(raw.serpapi_pagination?.next || raw.pagination?.next),
	};
}
export async function discoverTarget(
	query: DiscoveryQuery,
	request: typeof requestSerpApi = requestSerpApi,
	resolve = targetLocation,
): Promise<DiscoveryResponse> {
	const params = targetParams(query),
		store = await resolve(params.delivery_zip);
	const location = {
		zip: params.delivery_zip,
		radiusMiles: query.radiusMiles ?? 25,
		distanceMiles: store.distance,
		covered: store.distance <= (query.radiusMiles ?? 25),
	};
	if (!location.covered)
		return {
			source: 'serpapi-target',
			retailer: 'Target',
			storeId: store.id,
			storeName: store.name,
			zip: params.delivery_zip,
			offerScope: 'store-context',
			query,
			fetchedAt: new Date().toISOString(),
			providerCreatedAt: null,
			deals: [],
			productsChecked: 0,
			skippedProducts: 0,
			hasMore: false,
			location,
		};
	const result = await searchDepartments(shoppingDepartments.target, async (department) => {
		const term = `${department} clearance`;
		return normalizeTarget(await request({ ...params, q: term }), query, term);
	});
	return { ...result, location };
}
