import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverWalmart } from '../src/retailers/walmart-discovery.js';
import { normalizeShopping, shoppingParams } from '../src/retailers/shopping-discovery.js';
import { discoveryCacheScope } from '../src/retailers/discovery-cache.js';
import type { DiscoveryQuery } from '@flipscout/types';
const query: DiscoveryQuery = {
	retailer: 'walmart',
	category: 'all',
	kind: 'all',
	page: 1,
	zip: '10001',
	radiusMiles: 25,
};
const fixture = (params: Record<string, string> = shoppingParams(query)) => ({
	search_metadata: { status: 'Success' },
	search_parameters: { ...params, location_requested: params.location },
	shopping_results: [
		{
			product_id: '123456789',
			title: 'Test',
			source: 'Walmart',
			price: '$5.00',
			extracted_price: 5,
			old_price: '$10.00',
			extracted_old_price: 10,
			link: 'https://www.walmart.com/ip/123456789',
		},
	],
});
test('Walmart uses each resolved ZIP instead of a fixed store', async () => {
	for (const [zip, state] of [
		['33511', 'Florida'],
		['10001', 'New York'],
		['90210', 'California'],
		['02108', 'Massachusetts'],
	]) {
		let requests = 0;
		const result = await discoverWalmart(
			{ ...query, zip },
			async (params) => {
				requests++;
				assert.equal(params.location, `${zip},${state},United States`);
				assert.equal(params.engine, 'google_shopping');
				assert.equal(params.store_id, undefined);
				return fixture(params);
			},
			async (requested) => {
				assert.equal(requested, zip);
				return `${zip},${state},United States`;
			},
		);
		assert.equal(requests, 1);
		assert.equal(result.zip, zip);
		assert.equal(result.query.zip, zip);
		assert.equal(result.deals.length, 1);
		assert.equal(result.deals[0].savings, 5);
		assert.equal(result.storeId, null);
		assert.equal(result.offerScope, 'online');
		assert.equal(result.deals[0].quantity, null);
	}
});
test('Walmart rejects mismatched ZIP context and other merchants', () => {
	const f = fixture();
	f.search_parameters.location_requested = '33511,United States';
	assert.throws(() => normalizeShopping(f, query), /CONTEXT_MISMATCH/);
	const other = fixture();
	other.shopping_results[0].source = 'eBay - Walmart';
	assert.equal(normalizeShopping(other, query).deals.length, 0);
});
test('Walmart cache isolates ZIPs and avoids old Brandon pilot entries', () => {
	const first = discoveryCacheScope(query).key;
	assert.notEqual(first, discoveryCacheScope({ ...query, zip: '33511' }).key);
	assert.equal(first, discoveryCacheScope({ ...query, kind: 'penny', radiusMiles: 5 }).key);
	const brandon = discoveryCacheScope({ ...query, zip: '33511' }).key;
	assert.notEqual(brandon, JSON.stringify(['discovery-v1', '33511', 'walmart', 'all', 1]));
	assert.equal(JSON.parse(brandon)[0], 'shopping-v1');
});
test('invalid ZIPs fail before spending a search and lookup failures propagate', async () => {
	let calls = 0;
	const request = async () => {
		calls++;
		return fixture();
	};
	await assert.rejects(discoverWalmart({ ...query, zip: '1234' }, request));
	await assert.rejects(
		discoverWalmart(query, request, async () => {
			throw Error('ZIP lookup failed');
		}),
	);
	assert.equal(calls, 0);
});
