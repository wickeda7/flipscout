import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTarget, targetParams, discoverTarget } from '../src/retailers/target-discovery.js';
import { discoveryCacheScope } from '../src/retailers/discovery-cache.js';
import type { DiscoveryQuery } from '@flipscout/types';
const q: DiscoveryQuery = { retailer: 'target', zip: '33511', radiusMiles: 25, category: 'all', kind: 'all', page: 1 };
const fixture = (): any => ({
	search_metadata: { status: 'Success' },
	search_parameters: targetParams(q),
	organic_results: [
		{
			tcin: '12345678',
			title: 'Test',
			price: '$5.00',
			extracted_price: 5,
			old_price: '$10.00',
			extracted_old_price: 10,
			link: 'https://www.target.com/p/test/-/A-12345678',
			thumbnail: 'https://target.scene7.com/is/image/Target/test',
			price_note: 'When purchased online',
		},
	],
});
test('Target uses native context and direct matching links without stock claims', () => {
	const r = normalizeTarget(fixture(), q);
	assert.equal(r.deals[0].savings, 5);
	assert.equal(r.deals[0].quantity, null);
	assert.equal(r.source, 'serpapi-target');
	assert.equal(r.deals[0].promotion, 'When purchased online');
});
test('range prices, mismatched variants and arbitrary domains are excluded', () => {
	for (const patch of [
		{ price: '$5.00 - $10.00' },
		{ link: 'https://www.google.com/search?q=x' },
		{ link: 'https://www.target.com/p/test/-/A-87654321' },
	]) {
		const f = fixture();
		Object.assign(f.organic_results[0], patch);
		assert.equal(normalizeTarget(f, q).deals.length, 0);
	}
});
test('wrong store and missing response cannot become empty success', () => {
	const f = fixture();
	f.search_parameters.store_id = '1771';
	assert.throws(() => normalizeTarget(f, q), /CONTEXT/);
	delete f.organic_results;
	f.search_parameters = targetParams(q);
	assert.throws(() => normalizeTarget(f, q), /INVALID/);
});
test('outside connected area makes no paid call', async () => {
	const r = await discoverTarget(
		q,
		async () => {
			throw Error('must not call');
		},
		async () => ({ id: '812', name: 'Brandon', distance: 100 }),
	);
	assert.equal(r.location?.covered, false);
});
test('cache version bypasses Google results and filters share the same scan', () => {
	assert.equal(JSON.parse(discoveryCacheScope(q).key)[0], 'target-departments-v2');
	assert.equal(discoveryCacheScope(q).key, discoveryCacheScope({ ...q, kind: 'penny', radiusMiles: 5 }).key);
});

test('Target searches six departments and merges duplicate products', async () => {
	const terms: string[] = [];
	const result = await discoverTarget(
		q,
		async (params) => {
			terms.push(params.q);
			return { ...fixture(), search_parameters: params };
		},
		async () => ({ id: '812', name: 'Brandon', distance: 2 }),
	);
	assert.equal(new Set(terms).size, 6);
	assert.equal(result.deals.length, 1);
	assert.equal(result.coverage?.completed, 6);
});
