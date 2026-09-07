export interface MarketplacePreset {
	id: string;
	name: string;
	feePercent: number;
	flatFee: number;
	defaultShipping: number;
	note: string;
}

export const marketplacePresets: MarketplacePreset[] = [
	{
		id: 'ebay',
		name: 'eBay',
		feePercent: 13.25,
		flatFee: 0.3,
		defaultShipping: 10,
		note: 'General planning estimate. Actual fees vary by category and account.',
	},
	{
		id: 'amazon',
		name: 'Amazon',
		feePercent: 15,
		flatFee: 0,
		defaultShipping: 10,
		note: 'Planning estimate only. Referral, fulfillment, storage, and other fees can vary.',
	},
	{
		id: 'facebook',
		name: 'Facebook Marketplace',
		feePercent: 0,
		flatFee: 0,
		defaultShipping: 0,
		note: 'Configured as a local cash sale by default.',
	},
	{
		id: 'offerup',
		name: 'OfferUp',
		feePercent: 0,
		flatFee: 0,
		defaultShipping: 0,
		note: 'Configured as a local sale by default.',
	},
	{
		id: 'local',
		name: 'Local Sale',
		feePercent: 0,
		flatFee: 0,
		defaultShipping: 0,
		note: 'No marketplace fee or shipping assumed.',
	},
	{
		id: 'custom',
		name: 'Custom',
		feePercent: 0,
		flatFee: 0,
		defaultShipping: 0,
		note: 'Enter your own selling costs.',
	},
];

export function getMarketplacePreset(id: string) {
	return marketplacePresets.find((preset) => preset.id === id) ?? marketplacePresets[0];
}
