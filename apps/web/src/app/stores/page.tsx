"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import type { GeoLocation, StoreSearchQuery, StoreSearchResponse, StoreSummary } from "@flipscout/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { StoreInventory } from "@/components/stores/StoreInventory";
import { RoutePlanner } from "@/components/stores/RoutePlanner";
import type { StoreOpportunity } from "@/lib/store-planning";
import { flipScoutApi } from "@/lib/api";
import { currentLocation, LocationError, parseManualLocation, type LocationErrorCode } from "@/lib/location";
import { useI18n } from "@/components/i18n/I18nProvider";

const inputClass = "mt-2 w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40";
const buttonClass = "rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";
function opportunity(s: StoreSummary): StoreOpportunity {
  return { ...s, key: s.id, distanceMiles: s.distanceMiles!, dealCount: s.activeDealCount,
    profitPerMile: s.distanceMiles ? s.totalPotentialProfit / s.distanceMiles : 0, deals: [] };
}

export default function StoresPage() {
  const { t } = useI18n();
  const [inventoryStore, setInventoryStore] = useState<string | null>(null);
  const [origin, setOrigin] = useState<GeoLocation | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationErrorCode | null>(null);
  const locationVersion = useRef(0);
  const [q, setQ] = useState("");
  const [retailer, setRetailer] = useState("");
  const [source, setSource] = useState("");
  const [radius, setRadius] = useState(25);
  const [sort, setSort] = useState<"name" | "distance">("name");
  const [query, setQuery] = useState<StoreSearchQuery>({ limit: 12, offset: 0 });
  const [data, setData] = useState<StoreSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [trip, setTrip] = useState<StoreSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController(); let current = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setFailed(false); setData(null);
    flipScoutApi.searchStores(query, controller.signal).then(result => {
      if (current) setData(result);
    }).catch(() => { if (current) setFailed(true); }).finally(() => {
      clearTimeout(timer); if (current) setLoading(false);
    });
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => () => { locationVersion.current++; }, []);

  function search(nextOrigin = origin, nextSort = sort) {
    setQuery({ q: q.trim() || undefined, retailer: retailer.trim() || undefined, source: source.trim() || undefined,
      latitude: nextOrigin?.latitude, longitude: nextOrigin?.longitude,
      radiusMiles: nextOrigin ? radius : undefined, sort: nextOrigin ? nextSort : "name", limit: 12, offset: 0 });
  }
  function applyOrigin(point: GeoLocation | null) {
    locationVersion.current++; setLocating(false); setLocationError(null); setOrigin(point); setTrip([]); setInventoryStore(null);
    setLatitude(point ? String(point.latitude) : ""); setLongitude(point ? String(point.longitude) : "");
    const nextSort = point ? "distance" : "name"; setSort(nextSort); search(point, nextSort);
  }
  async function locate() {
    const version = ++locationVersion.current; setLocating(true); setLocationError(null);
    try {
      const point = await currentLocation(navigator.geolocation);
      if (version === locationVersion.current) applyOrigin(point);
    } catch (error) {
      if (version === locationVersion.current) setLocationError(error instanceof LocationError ? error.code : "unavailable");
    } finally { if (version === locationVersion.current) setLocating(false); }
  }
  function toggleTrip(s: StoreSummary) {
    setTrip(current => current.some(x => x.id === s.id) ? current.filter(x => x.id !== s.id) : current.length < 10 ? [...current, s] : current);
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6">
            <p className="text-sm text-emerald-400">{t("nav.stores")}</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t("find.title")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">{t("find.subtitle")}</p>
          </header>

          <section className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5" aria-label={t("find.origin")}>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={locate} disabled={locating} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Navigation size={16} />{t(locating ? "find.locating" : "find.locate")}</button>
              <button type="button" onClick={() => applyOrigin(null)} className={buttonClass}>{t("find.clear")}</button>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-neutral-400">{t("find.privacy")}</p>
            <p className="mt-3 text-sm" aria-live="polite">{origin ? `${t("find.origin")}: ${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}` : t("find.noOrigin")}</p>
            {locationError && <p role="alert" className="mt-3 text-sm text-amber-300">{t(`find.${locationError}`)}</p>}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-emerald-200">{t("find.manual")}</summary>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-xs text-neutral-400">{t("route.startLatitude")}<input className={inputClass} value={latitude} onChange={e => setLatitude(e.target.value)} inputMode="decimal" /></label>
                <label className="text-xs text-neutral-400">{t("route.startLongitude")}<input className={inputClass} value={longitude} onChange={e => setLongitude(e.target.value)} inputMode="decimal" /></label>
                <button type="button" className={buttonClass} onClick={() => {
                  try { applyOrigin(parseManualLocation(latitude, longitude)); }
                  catch { setLocationError("invalid"); }
                }}>{t("find.apply")}</button>
              </div>
            </details>
          </section>

          <form onSubmit={e => { e.preventDefault(); search(); }} className="mb-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-neutral-400">{t("find.query")}<input value={q} onChange={e => setQ(e.target.value)} maxLength={120} className={inputClass} /></label>
              <label className="text-xs text-neutral-400">{t("find.retailer")}<input value={retailer} onChange={e => setRetailer(e.target.value)} maxLength={80} className={inputClass} /></label>
              <label className="text-xs text-neutral-400">{t("find.source")}<input value={source} onChange={e => setSource(e.target.value)} maxLength={64} className={inputClass} /></label>
              <label className="text-xs text-neutral-400">{t("find.radius")}<select value={radius} onChange={e => setRadius(Number(e.target.value))} disabled={!origin} className={inputClass}>{[5, 10, 25, 50, 100, 250, 500].map(n => <option key={n} value={n}>{n} {t("find.miles")}</option>)}</select></label>
              <label className="text-xs text-neutral-400">{t("find.sort")}<select value={sort} onChange={e => setSort(e.target.value as "name" | "distance")} className={inputClass}><option value="name">{t("find.name")}</option><option value="distance" disabled={!origin}>{t("find.nearest")}</option></select></label>
              <button type="submit" className={`${buttonClass} mt-auto flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200`}><Search size={16} />{t("find.search")}</button>
            </div>
          </form>

          <p className="mb-2 text-xs text-neutral-500">{t("find.catalog")}</p>
          {data?.dataProvider === "mock" && <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">{t("find.demo")}</p>}
          <div aria-live="polite" aria-busy={loading}>
            {loading && <p className="py-8 text-neutral-400">{t("find.loading")}</p>}
            {failed && <p role="alert" className="py-8 text-amber-300">{t("find.failed")}</p>}
            {data && <>
              <p className="mb-4 text-sm text-neutral-400">{data.total} {t("find.results")}</p>
              {data.stores.length === 0 && <p className="rounded-2xl border border-white/10 p-8 text-neutral-400">{t("find.empty")}</p>}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.stores.map(store => {
                  const added = trip.some(s => s.id === store.id);
                  return <article key={store.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <p className="text-xs text-emerald-300">{store.retailer} · {store.source}</p>
                    <h2 className="mt-2 text-lg font-semibold">{store.storeName}</h2>
                    <p className="mt-1 text-sm text-neutral-400">{store.city}, {store.state}</p>
                    <p className="mt-4 flex items-center gap-2 text-sm"><MapPin size={15} />{store.distanceMiles === null ? t("find.noDistance") : `${store.distanceMiles.toFixed(1)} ${t("find.straight")}`}</p>
                    <p className="my-4 text-sm text-neutral-400">{store.activeDealCount ? `${t("find.deals")}: ${store.activeDealCount}` : t("find.noDeals")}</p>
                    <button type="button" className={`${buttonClass} mb-3`} onClick={() => setInventoryStore(store.id)}>{t("inventory.open")}</button>
                    <button type="button" aria-pressed={added} disabled={!origin || (!added && trip.length >= 10)} onClick={() => toggleTrip(store)} className={`${buttonClass} mt-auto ${added ? "border-emerald-400 text-emerald-300" : ""}`}>{t(added ? "find.remove" : "find.add")}</button>
                  </article>;
                })}
              </div>
              <nav className="my-5 flex items-center justify-between gap-3" aria-label={t("find.page")}>
                <button type="button" className={buttonClass} disabled={data.offset === 0} onClick={() => setQuery(current => ({ ...current, offset: Math.max(0, data.offset - data.limit) }))}>{t("find.previous")}</button>
                <span className="text-sm text-neutral-400">{t("find.page")} {Math.floor(data.offset / data.limit) + 1}</span>
                <button type="button" className={buttonClass} disabled={!data.hasMore} onClick={() => setQuery(current => ({ ...current, offset: data.offset + data.limit }))}>{t("find.next")}</button>
              </nav>
            </>}
          </div>
          {inventoryStore && <StoreInventory key={inventoryStore} storeId={inventoryStore} origin={origin} onClose={() => setInventoryStore(null)} />}
          <p className="my-4 text-xs text-neutral-500">{t("find.inventory")}</p>
          <p className="my-4 text-sm text-neutral-400">{t(trip.length >= 10 ? "find.tripLimit" : "find.tripHint")}</p>
          {origin && trip.length > 0 && <RoutePlanner key={`${origin.latitude},${origin.longitude}:${trip.map(s => s.id).join("|")}`} stores={trip.map(opportunity)} initialOrigin={origin} />}
        </div>
      </main>
    </div>
  );
}
