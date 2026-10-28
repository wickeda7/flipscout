import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverWalmart, verifiedWalmartDeal } from '../src/retailers/walmart-discovery.js';
import { discoveryCacheScope } from '../src/retailers/discovery-cache.js';
import type { DiscoveryQuery } from '@flipscout/types';
const query: DiscoveryQuery = {
	retailer: 'walmart',
	category: 'all',
	kind: 'all',
	page: 1,
	zip: '33511',
	radiusMiles: 25,
};
const candidate = {
	us_item_id: '123',
	seller_name: 'Walmart.com',
	seller_id: 'W',
	primary_offer: { offer_price: 5, was_price: 10 },
};
const detail = (): any => ({
	search_metadata: { status: 'Success' },
	search_parameters: { engine: 'walmart_product', product_id: '123', store_id: '2387' },
	search_information: { location: { store_id: '2387' } },
	product_result: {
		us_item_id: '123',
		title: 'Exact variant',
		seller_name: 'Walmart.com',
		seller_id: 'W',
		price_map: { price: 6, was_price: { price: 10 }, currency: 'USD' },
		variants: ['color-red'],
		pickup_option: { available: true },
	},
});
const resolve = async () => ({
	id: '2387',
	zip: '33511',
	address: 'Test store',
	latitude: 0,
	longitude: 0,
	distanceMiles: 1,
});
test('display verified price, exact item link and fulfillment without fabricated shelf quantity', () => {
	const d = verifiedWalmartDeal(detail(), candidate, '2387')!;
	assert.equal(d.price, 6);
	assert.equal(d.productUrl, 'https://www.walmart.com/ip/123');
	assert.equal(d.quantity, null);
	assert.equal(d.verification?.pickup, true);
});
test('reject wrong item, seller, currency and missing markdown; reject wrong store', () => {
	for (const mutate of [
		(p: any) => (p.us_item_id = '456'),
		(p: any) => (p.seller_id = 'OTHER'),
		(p: any) => (p.price_map.currency = 'CAD'),
		(p: any) => (p.price_map.was_price = null),
	]) {
		const raw = detail();
		mutate(raw.product_result);
		assert.equal(verifiedWalmartDeal(raw, candidate, '2387'), null);
	}
	assert.throws(() => verifiedWalmartDeal(detail(), candidate, '3463'), /CONTEXT/);
});
test('search then verify with Walmart engines; no Google fallback', async () => {
	const calls: string[] = [];
	const r = await discoverWalmart(
		query,
		async (p) => {
			calls.push(p.engine);
			if (p.engine === 'walmart_product') return detail();
			return {
				search_metadata: { status: 'Success' },
				search_parameters: p,
				search_information: { location: { store_id: '2387' } },
				organic_results: [candidate],
			};
		},
		resolve,
	);
	assert.equal(calls.filter((x) => x === 'walmart').length, 6);
	assert.equal(calls.filter((x) => x === 'walmart_product').length, 1);
	assert.equal(r.deals.length, 1);
	assert.equal(r.source, 'serpapi-walmart');
});
test('no provider calls outside radius and failed verification is not empty success', async () => {
	await assert.rejects(
		discoverWalmart(
			query,
			async (p) => {
				if (p.engine === 'walmart_product') throw Error('offline');
				return {
					search_metadata: { status: 'Success' },
					search_parameters: p,
					search_information: { location: { store_id: '2387' } },
					organic_results: [candidate],
				};
			},
			resolve,
		),
		/VERIFICATION_UNAVAILABLE/,
	);
	const r = await discoverWalmart(
		query,
		async () => {
			throw Error('must not call');
		},
		async () => ({ ...(await resolve()), distanceMiles: 30 }),
	);
	assert.equal(r.location?.covered, false);
});
test('cache isolates old Google data and ZIPs while sharing filters', () => {
	assert.equal(JSON.parse(discoveryCacheScope(query).key)[0], 'walmart-multidepartment-v2');
	assert.notEqual(discoveryCacheScope(query).key, discoveryCacheScope({ ...query, zip: '10001' }).key);
	assert.equal(discoveryCacheScope(query).key, discoveryCacheScope({ ...query, kind: 'penny', radiusMiles: 5 }).key);
});

test('catalog resolves multiple US regions to nearby listed stores', async () => {
	const { nearestWalmartStore } = await import('../src/retailers/walmart-discovery.js');
	for (const origin of [
		{ latitude: 27.9056, longitude: -82.2881 },
		{ latitude: 40.75, longitude: -73.99 },
		{ latitude: 34.09, longitude: -118.4 },
	]) {
		const store = nearestWalmartStore(origin);
		assert.ok(store.distanceMiles < 25);
		assert.match(store.id, /^\d+$/);
		assert.ok(!store.address.endsWith(', MX'));
	}
});

test('verification cap includes every department and reports skipped checks', async () => {
	const { walmartSearchTerms } = await import('../src/retailers/walmart-discovery.js');
	const checked: string[] = [];
	const r = await discoverWalmart(
		query,
		async (p) => {
			if (p.engine === 'walmart')
				return {
					search_metadata: { status: 'Success' },
					search_parameters: p,
					search_information: { location: { store_id: '2387' } },
					organic_results: Array.from({ length: 12 }, (_, i) => ({
						...candidate,
						us_item_id: String(1000 + walmartSearchTerms.indexOf(p.query) * 100 + i),
					})),
				};
			checked.push(p.product_id);
			const d = detail();
			d.search_parameters.product_id = p.product_id;
			d.product_result.us_item_id = p.product_id;
			return d;
		},
		resolve,
	);
	assert.equal(checked.length, 40);
	assert.equal(new Set(checked.map((id) => Math.floor((Number(id) - 1000) / 100))).size, 6);
	assert.equal(r.coverage?.completed, 6);
	assert.equal(r.verificationCoverage?.failed, 32);
});
test('one failed department preserves others; all failures throw', async () => {
	const r = await discoverWalmart(
		query,
		async (p) => {
			if (p.query === 'tools clearance') throw Error('offline');
			return {
				search_metadata: { status: 'Success' },
				search_parameters: p,
				search_information: { location: { store_id: '2387' } },
				organic_results: [],
			};
		},
		resolve,
	);
	assert.equal(r.coverage?.failed, 1);
	await assert.rejects(
		discoverWalmart(
			query,
			async () => {
				throw Error('offline');
			},
			resolve,
		),
		/offline/,
	);
});
