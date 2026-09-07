'use client';

import { useMemo, useState } from 'react';
import { calculateMaximumPurchasePrice, calculateProfit } from '@/lib/profit';
import { calculateBuyScore } from '@/lib/buy-score';
import { getMarketplacePreset, marketplacePresets } from '@/lib/marketplaces';

function currency(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(value);
}

export function ProfitCalculator() {
	const [marketplace, setMarketplace] = useState('ebay');
	const [purchasePrice, setPurchasePrice] = useState(35);
	const [retailPrice, setRetailPrice] = useState(159);
	const [resalePrice, setResalePrice] = useState(98);
	const [feePercent, setFeePercent] = useState(13.25);
	const [flatFee, setFlatFee] = useState(0.3);
	const [shipping, setShipping] = useState(10);
	const [otherCosts, setOtherCosts] = useState(0);
	const [inventory, setInventory] = useState(4);
	const [distanceMiles, setDistanceMiles] = useState(8);
	const [targetProfit, setTargetProfit] = useState(30);
	const [targetRoi, setTargetRoi] = useState(100);

	const preset = getMarketplacePreset(marketplace);

	const result = useMemo(() => {
		const profit = calculateProfit({
			purchasePrice,
			resalePrice,
			marketplaceFeePercent: feePercent,
			marketplaceFeeFlat: flatFee,
			shippingCost: shipping,
			otherCosts,
		});

		const discountPercent = retailPrice > 0 ? ((retailPrice - purchasePrice) / retailPrice) * 100 : 0;

		const buy = calculateBuyScore({
			roiPercent: profit.roiPercent,
			netProfit: profit.netProfit,
			discountPercent,
			inventory,
			distanceMiles,
		});

		const maximumPurchase = calculateMaximumPurchasePrice({
			resalePrice,
			marketplaceFeePercent: feePercent,
			marketplaceFeeFlat: flatFee,
			shippingCost: shipping,
			otherCosts,
			targetProfit,
			targetRoiPercent: targetRoi,
		});

		return { profit, buy, discountPercent, maximumPurchase };
	}, [
		purchasePrice,
		retailPrice,
		resalePrice,
		feePercent,
		flatFee,
		shipping,
		otherCosts,
		inventory,
		distanceMiles,
		targetProfit,
		targetRoi,
	]);

	function handleMarketplaceChange(id: string) {
		setMarketplace(id);
		const next = getMarketplacePreset(id);
		setFeePercent(next.feePercent);
		setFlatFee(next.flatFee);
		setShipping(next.defaultShipping);
	}

	const purchaseDelta = result.maximumPurchase.recommendedMaxPurchasePrice - purchasePrice;

	return (
		<div className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
			<section className='rounded-2xl border border-white/10 bg-neutral-950 p-5'>
				<div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
					<div>
						<h2 className='text-xl font-semibold text-white'>Profit calculator</h2>
						<p className='mt-1 text-sm text-neutral-500'>Estimate profit before buying inventory.</p>
					</div>

					<label className='min-w-52'>
						<span className='mb-2 block text-xs font-medium text-neutral-400'>Marketplace</span>
						<select
							value={marketplace}
							onChange={(e) => handleMarketplaceChange(e.target.value)}
							className='w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/30'>
							{marketplacePresets.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</select>
					</label>
				</div>

				<div className='mt-4 rounded-xl border border-white/5 bg-white/[0.025] p-3 text-xs text-neutral-500'>
					{preset.note} Fee fields below remain editable.
				</div>

				<div className='mt-6 grid gap-4 sm:grid-cols-2'>
					<NumberField label='Retail price' value={retailPrice} onChange={setRetailPrice} />
					<NumberField label='Purchase price' value={purchasePrice} onChange={setPurchasePrice} />
					<NumberField label='Expected resale price' value={resalePrice} onChange={setResalePrice} />
					<NumberField label='Marketplace fee %' value={feePercent} onChange={setFeePercent} step={0.25} />
					<NumberField label='Flat marketplace fee' value={flatFee} onChange={setFlatFee} />
					<NumberField label='Shipping cost' value={shipping} onChange={setShipping} />
					<NumberField label='Other costs' value={otherCosts} onChange={setOtherCosts} />
					<NumberField label='Units available' value={inventory} onChange={setInventory} step={1} />
					<NumberField label='Distance (miles)' value={distanceMiles} onChange={setDistanceMiles} />
				</div>

				<div className='mt-6 border-t border-white/10 pt-6'>
					<h3 className='font-semibold text-white'>Purchase targets</h3>
					<p className='mt-1 text-xs text-neutral-500'>Set the minimum return you want before buying.</p>

					<div className='mt-4 grid gap-4 sm:grid-cols-2'>
						<NumberField label='Minimum profit' value={targetProfit} onChange={setTargetProfit} />
						<NumberField label='Minimum ROI %' value={targetRoi} onChange={setTargetRoi} step={5} />
					</div>
				</div>
			</section>

			<div className='space-y-6'>
				<section className='rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
					<div className='flex items-start justify-between gap-4'>
						<div>
							<p className='text-sm text-neutral-500'>BUY score</p>
							<div className='mt-1 text-5xl font-bold tracking-tight text-white'>{result.buy.score}</div>
							<p className='mt-2 text-sm font-semibold text-neutral-300'>{result.buy.label}</p>
						</div>

						<div className='rounded-xl border border-white/10 bg-black px-4 py-3 text-right'>
							<div className='text-xs text-neutral-500'>Net profit</div>
							<div className='mt-1 text-2xl font-semibold text-white'>{currency(result.profit.netProfit)}</div>
						</div>
					</div>

					<div className='mt-6 grid grid-cols-2 gap-3'>
						<Metric label='ROI' value={`${result.profit.roiPercent.toFixed(1)}%`} />
						<Metric label='Margin' value={`${result.profit.marginPercent.toFixed(1)}%`} />
						<Metric label='Marketplace fees' value={currency(result.profit.marketplaceFees)} />
						<Metric label='Break-even price' value={currency(result.profit.breakEvenPrice)} />
						<Metric label='Discount' value={`${result.discountPercent.toFixed(1)}%`} />
						<Metric label='Total costs' value={currency(result.profit.totalCosts)} />
					</div>
				</section>

				<section className='rounded-2xl border border-white/10 bg-neutral-950 p-5'>
					<p className='text-sm text-neutral-500'>Recommended maximum purchase price</p>

					<div className='mt-2 text-4xl font-bold tracking-tight text-white'>
						{currency(result.maximumPurchase.recommendedMaxPurchasePrice)}
					</div>

					<p className='mt-3 text-sm text-neutral-400'>
						Based on at least {currency(targetProfit)} profit and {targetRoi.toFixed(0)}% ROI.
					</p>

					<div className='mt-5 grid grid-cols-2 gap-3'>
						<Metric label='Profit-limit price' value={currency(result.maximumPurchase.byProfitTarget)} />
						<Metric label='ROI-limit price' value={currency(result.maximumPurchase.byRoiTarget)} />
					</div>

					<div
						className={[
							'mt-4 rounded-xl border p-4 text-sm',
							purchaseDelta >= 0
								? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
								: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
						].join(' ')}>
						{purchaseDelta >= 0
							? `Current price is ${currency(Math.abs(purchaseDelta))} below your maximum.`
							: `Current price is ${currency(Math.abs(purchaseDelta))} above your target maximum.`}
					</div>
				</section>
			</div>
		</div>
	);
}

function NumberField({
	label,
	value,
	onChange,
	step = 0.01,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	step?: number;
}) {
	return (
		<label className='block'>
			<span className='mb-2 block text-xs font-medium text-neutral-400'>{label}</span>
			<input
				type='number'
				min='0'
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className='w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/30'
			/>
		</label>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className='rounded-xl border border-white/5 bg-black/40 p-3'>
			<div className='text-xs text-neutral-500'>{label}</div>
			<div className='mt-1 text-lg font-semibold text-neutral-100'>{value}</div>
		</div>
	);
}
