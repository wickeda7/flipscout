"use client";
import { useEffect, useRef, useState } from "react";
import type { GeoLocation, StoreInventoryResponse } from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";
import { useI18n } from "@/components/i18n/I18nProvider";
import { DealCard } from "@/components/dashboard/DealCard";

export function StoreInventory({ storeId, origin, onClose }: { storeId: string; origin: GeoLocation | null; onClose: () => void }) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<StoreInventoryResponse | null>(null);
  const [error, setError] = useState<"failed" | "missing" | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError(null); setData(null);
    flipScoutApi.getStoreInventory(storeId, { latitude: origin?.latitude, longitude: origin?.longitude, limit: 6, offset }, controller.signal)
      .then(result => { if (active) setData(result); })
      .catch((e: Error & { code?: string }) => { if (active) setError(e.code === "STORE_NOT_FOUND" ? "missing" : "failed"); })
      .finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [storeId, origin?.latitude, origin?.longitude, offset, attempt]);
  const buttonClass = "rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40";
  return <section className="my-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.03] p-5" aria-labelledby="inventory-heading">
    <div className="flex items-start justify-between gap-4">
      <h2 id="inventory-heading" ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{data?.store.storeName ?? t("inventory.title")}</h2>
      <button type="button" className={buttonClass} onClick={onClose}>{t("inventory.close")}</button>
    </div>
    <p className="my-3 text-sm text-neutral-400">{t("inventory.description")}</p>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p className="py-5 text-neutral-400">{t("inventory.loading")}</p>}
      {error && <div role="alert" className="py-4 text-amber-200"><p>{t(error === "missing" ? "inventory.missing" : "inventory.failed")}</p><button type="button" className={`${buttonClass} mt-3`} onClick={() => setAttempt(n => n + 1)}>{t("inventory.retry")}</button></div>}
      {data && <>
        {data.deals.length === 0 && <p className="py-5 text-neutral-400">{t("inventory.empty")}</p>}
        <div className="grid gap-4 lg:grid-cols-2">{data.deals.map(deal => <DealCard key={deal.id} deal={deal} showDistance={origin !== null} />)}</div>
        <nav className="mt-4 flex items-center justify-between" aria-label={t("inventory.pages")}>
          <button type="button" className={buttonClass} disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - 6))}>{t("find.previous")}</button>
          <span className="text-sm text-neutral-400">{t("find.page")} {Math.floor(offset / 6) + 1}</span>
          <button type="button" className={buttonClass} disabled={!data.hasMore} onClick={() => setOffset(n => n + 6)}>{t("find.next")}</button>
        </nav>
      </>}
    </div>
  </section>;
}
