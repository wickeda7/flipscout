"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  calculateMaximumPurchasePrice,
  calculateProfit,
} from "@/lib/profit";
import { calculateBuyScore } from "@/lib/buy-score";
import {
  getMarketplacePreset,
  marketplacePresets,
} from "@/lib/marketplaces";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function ProfitCalculator() {
  const { t } = useI18n();
  const [marketplace, setMarketplace] = useState("ebay");
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

    const discountPercent =
      retailPrice > 0
        ? ((retailPrice - purchasePrice) / retailPrice) * 100
        : 0;

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

  const purchaseDelta =
    result.maximumPurchase.recommendedMaxPurchasePrice - purchasePrice;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("calculator.profitTitle")}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {t("calculator.profitSubtitle")}
            </p>
          </div>

          <label className="min-w-52">
            <span className="mb-2 block text-xs font-medium text-neutral-400">
              Marketplace
            </span>
            <select
              value={marketplace}
              onChange={(e) => handleMarketplaceChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/30"
            >
              {marketplacePresets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.025] p-3 text-xs text-neutral-500">
          {preset.note} {t("calculator.feeEditable")}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <NumberField label={t("calculator.retailPrice")} value={retailPrice} onChange={setRetailPrice} />
          <NumberField label={t("calculator.purchasePrice")} value={purchasePrice} onChange={setPurchasePrice} />
          <NumberField label={t("calculator.resalePrice")} value={resalePrice} onChange={setResalePrice} />
          <NumberField label={t("calculator.marketplaceFee")} value={feePercent} onChange={setFeePercent} step={0.25} />
          <NumberField label={t("calculator.flatFee")} value={flatFee} onChange={setFlatFee} />
          <NumberField label={t("calculator.shipping")} value={shipping} onChange={setShipping} />
          <NumberField label={t("calculator.otherCosts")} value={otherCosts} onChange={setOtherCosts} />
          <NumberField label={t("calculator.unitsAvailable")} value={inventory} onChange={setInventory} step={1} />
          <NumberField label={t("calculator.distanceMiles")} value={distanceMiles} onChange={setDistanceMiles} />
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="font-semibold text-white">{t("calculator.purchaseTargets")}</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {t("calculator.purchaseTargetsHelp")}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField label={t("calculator.minimumProfit")} value={targetProfit} onChange={setTargetProfit} />
            <NumberField label={t("calculator.minimumRoi")} value={targetRoi} onChange={setTargetRoi} step={5} />
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">{t("calculator.buyScore")}</p>
              <div className="mt-1 text-5xl font-bold tracking-tight text-white">
                {result.buy.score}
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-300">
                {t(`status.${result.buy.label === "STRONG BUY" ? "strong-buy" : result.buy.label.toLowerCase()}` as any)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black px-4 py-3 text-right">
              <div className="text-xs text-neutral-500">{t("calculator.netProfit")}</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {currency(result.profit.netProfit)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric label="ROI" value={`${result.profit.roiPercent.toFixed(1)}%`} />
            <Metric label={t("calculator.margin")} value={`${result.profit.marginPercent.toFixed(1)}%`} />
            <Metric label={t("calculator.marketplaceFees")} value={currency(result.profit.marketplaceFees)} />
            <Metric label={t("calculator.breakEven")} value={currency(result.profit.breakEvenPrice)} />
            <Metric label={t("calculator.discount")} value={`${result.discountPercent.toFixed(1)}%`} />
            <Metric label={t("calculator.totalCosts")} value={currency(result.profit.totalCosts)} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
          <p className="text-sm text-neutral-500">
            {t("calculator.maxPurchase")}
          </p>

          <div className="mt-2 text-4xl font-bold tracking-tight text-white">
            {currency(result.maximumPurchase.recommendedMaxPurchasePrice)}
          </div>

          <p className="mt-3 text-sm text-neutral-400">
            {t("calculator.basedOn")} {currency(targetProfit)} {t("calculator.profitAnd")}{" "}
            {targetRoi.toFixed(0)}% {t("calculator.roi")}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric
              label={t("calculator.profitLimit")}
              value={currency(result.maximumPurchase.byProfitTarget)}
            />
            <Metric
              label={t("calculator.roiLimit")}
              value={currency(result.maximumPurchase.byRoiTarget)}
            />
          </div>

          <div
            className={[
              "mt-4 rounded-xl border p-4 text-sm",
              purchaseDelta >= 0
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/20 bg-amber-500/10 text-amber-200",
            ].join(" ")}
          >
            {purchaseDelta >= 0
              ? t("calculator.currentBelow", { amount: currency(Math.abs(purchaseDelta)) })
              : t("calculator.currentAbove", { amount: currency(Math.abs(purchaseDelta)) })}
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
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-neutral-400">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/30"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-neutral-100">{value}</div>
    </div>
  );
}
