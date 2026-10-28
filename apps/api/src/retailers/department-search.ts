import type { DiscoveryResponse } from '@flipscout/types';

/** Bound search fan-out; preserve failed-group visibility and interleave deduplicated results. */
export async function searchDepartments(
	terms: readonly string[],
	search: (term: string) => Promise<DiscoveryResponse>,
): Promise<DiscoveryResponse> {
	if (!terms.length) throw new Error('At least one department is required');
	const results: (DiscoveryResponse | undefined)[] = Array(terms.length);
	let next = 0;
	let firstError: unknown;
	await Promise.all(
		Array.from({ length: Math.min(2, terms.length) }, async () => {
			while (next < terms.length) {
				const i = next++;
				try {
					results[i] = await search(terms[i]);
				} catch (error) {
					firstError ??= error;
				}
			}
		}),
	);
	const successful = results.filter((r): r is DiscoveryResponse => Boolean(r));
	if (!successful.length) throw firstError;
	const seen = new Set<string>(),
		deals: DiscoveryResponse['deals'] = [];
	for (let row = 0; row < Math.max(...successful.map((r) => r.deals.length)); row++) {
		for (const result of results) {
			const deal = result?.deals[row];
			if (deal && !seen.has(deal.id)) {
				seen.add(deal.id);
				deals.push(deal);
			}
		}
	}
	const diagnostics = successful.every((r) => r.diagnostics)
		? { merchantMatched: 0, wrongMerchant: 0, notDiscounted: 0, invalid: 0 }
		: undefined;
	if (diagnostics)
		for (const r of successful)
			for (const key of Object.keys(diagnostics) as (keyof typeof diagnostics)[])
				diagnostics[key] += r.diagnostics![key];
	return {
		...successful[0],
		deals,
		diagnostics,
		productsChecked: successful.reduce((n, r) => n + r.productsChecked, 0),
		skippedProducts: successful.reduce((n, r) => n + r.skippedProducts, 0),
		hasMore: successful.some((r) => r.hasMore),
		providerCreatedAt: successful.every((r) => r.providerCreatedAt)
			? successful.map((r) => r.providerCreatedAt!).sort()[0]
			: null,
		coverage: { completed: successful.length, failed: terms.length - successful.length, total: terms.length },
	};
}
export const shoppingDepartments: Record<string, readonly string[]> = {
	lowes: ['tools', 'appliances', 'lighting', 'garden', 'storage', 'bath'],
	target: ['home', 'electronics', 'toys', 'outdoor', 'clothing', 'beauty'],
	'dollar-general': ['household', 'beauty', 'toys', 'clothing', 'food', 'seasonal'],
	walgreens: ['beauty', 'personal care', 'household', 'vitamins', 'toys', 'seasonal'],
	cvs: ['beauty', 'personal care', 'household', 'vitamins', 'snacks', 'seasonal'],
	costco: ['electronics', 'appliances', 'home', 'outdoor', 'clothing', 'food'],
	'sams-club': ['electronics', 'appliances', 'home', 'outdoor', 'clothing', 'food'],
	'best-buy': ['computers', 'televisions', 'audio', 'appliances', 'gaming', 'smart home'],
	'tractor-supply': ['tools', 'outdoor', 'pet supplies', 'farm supplies', 'clothing', 'hardware'],
	'office-depot': ['computers', 'printers', 'ink', 'office supplies', 'furniture', 'cleaning supplies'],
};
