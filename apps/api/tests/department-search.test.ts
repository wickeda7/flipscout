import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchDepartments } from '../src/retailers/department-search.js';
import type { DiscoveryResponse } from '@flipscout/types';
const response = (ids: string[]) =>
	({
		deals: ids.map((id) => ({ id })),
		productsChecked: ids.length,
		skippedProducts: 0,
		hasMore: false,
		providerCreatedAt: null,
	}) as DiscoveryResponse;
test('department merge is bounded, balanced, deduplicated and exposes failures', async () => {
	let active = 0,
		max = 0;
	const r = await searchDepartments(['a', 'b', 'c'], async (term) => {
		active++;
		max = Math.max(max, active);
		await new Promise((resolve) => setTimeout(resolve, 5));
		active--;
		if (term === 'c') throw Error('provider unavailable');
		return response(term === 'a' ? ['a1', 'shared', 'a2'] : ['b1', 'shared', 'b2']);
	});
	assert.equal(max, 2);
	assert.deepEqual(
		r.deals.map((d) => d.id),
		['a1', 'b1', 'shared', 'a2', 'b2'],
	);
	assert.deepEqual(r.coverage, { completed: 2, failed: 1, total: 3 });
	assert.equal(r.productsChecked, 6);
});
test('failed and empty scans cannot appear as successful empty results', async () => {
	await assert.rejects(
		searchDepartments(['a', 'b'], async () => {
			throw Error('unavailable');
		}),
		/unavailable/,
	);
	await assert.rejects(
		searchDepartments([], async () => response([])),
		/department/,
	);
});
