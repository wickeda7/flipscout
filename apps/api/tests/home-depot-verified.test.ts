import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyHomeDepotDeal, discoverVerifiedHomeDepot } from '../src/retailers/home-depot-verified.js';
import type { DiscoveryResponse, DiscoveredDeal } from '@flipscout/types';
const candidate: DiscoveredDeal = {
	id: '123456789',
	title: 'Search title',
	price: 5,
	originalPrice: 10,
	savings: 5,
	kind: 'clearance',
	promotion: 'Clearance',
	productUrl: 'https://www.homedepot.com/p/123456789',
	imageUrl: null,
	pickupText: null,
	quantity: 10,
	pickupStatus: 'local',
};
const result: DiscoveryResponse = {
	source: 'serpapi-home-depot',
	retailer: 'Home Depot',
	storeId: '6305',
	storeName: 'East Brandon',
	zip: '33511',
	query: { retailer: 'home-depot', category: 'all', kind: 'all', page: 1 },
	fetchedAt: new Date().toISOString(),
	providerCreatedAt: null,
	deals: [candidate],
	productsChecked: 1,
	skippedProducts: 0,
	hasMore: false,
};
const fixture = (): any => ({
	search_metadata: { status: 'Success' },
	search_parameters: { engine: 'home_depot_product', product_id: '123456789', store_id: '6305', delivery_zip: '33511' },
	product_results: {
		product_id: '123456789',
		title: 'Product title',
		price: 6,
		promotion: { original: 10 },
		model_number: 'ABC',
		fulfillment: { store: 'East Brandon', options: [{ type: 'Store Pickup', quantity: 2 }] },
	},
});
test('product price replaces search price and direct ID link is retained', () => {
	const d = verifyHomeDepotDeal(fixture(), candidate, result)!;
	assert.equal(d.price, 6);
	assert.equal(d.savings, 4);
	assert.equal(d.kind, 'sale');
	assert.equal(d.quantity, null);
	assert.equal(d.verification?.pickup, true);
	assert.equal(d.productUrl, candidate.productUrl);
});
test('reject wrong item/store/ZIP and vanished discounts', () => {
	for (const field of ['product_id', 'store_id', 'delivery_zip']) {
		const f = fixture();
		f.search_parameters[field] = 'wrong';
		assert.throws(() => verifyHomeDepotDeal(f, candidate, result));
	}
	const f = fixture();
	delete f.product_results.promotion;
	assert.equal(verifyHomeDepotDeal(f, candidate, result), null);
});
test('pickup at another store is unknown and one cent remains a candidate', () => {
	const f = fixture();
	f.product_results.price = 0.01;
	f.product_results.fulfillment.store = 'Other';
	const d = verifyHomeDepotDeal(f, candidate, result)!;
	assert.equal(d.kind, 'penny');
	assert.equal(d.verification?.pickup, null);
});
test('all verification failures throw instead of caching empty results', async () => {
	await assert.rejects(
		discoverVerifiedHomeDepot(
			result.query,
			async () => {
				throw Error('offline');
			},
			async () => structuredClone(result),
		),
		/VERIFICATION_UNAVAILABLE/,
	);
});
test('successful checks return coverage and omit products no longer discounted', async () => {
	const r = await discoverVerifiedHomeDepot(
		result.query,
		async (p) => {
			assert.equal(p.engine, 'home_depot_product');
			const f = fixture();
			f.product_results.price = 10;
			return f;
		},
		async () => structuredClone(result),
	);
	assert.equal(r.deals.length, 0);
	assert.equal(r.verificationCoverage.completed, 1);
});
