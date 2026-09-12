"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { discoveryRetailers, type DiscoveryRetailer } from "@flipscout/types";
import type { DiscoveryCategory, DiscoveryKind, DiscoveryQuery, DiscoveryResponse } from "@flipscout/types";
import { defaultDiscoverySettings, discoveryStorageKey, restoreSettings, searchSettingsParams } from "@/lib/discovery-settings";
import { flipScoutApi } from "@/lib/api";
import { useI18n } from "@/components/i18n/I18nProvider";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const button="rounded-xl border border-white/20 px-4 py-3 text-sm disabled:opacity-40";
export function DealDiscovery() {
  const {t,locale,setLocale}=useI18n();
  const [retailer,setRetailer]=useState<DiscoveryRetailer>("home-depot");
  const [category,setCategory]=useState<DiscoveryCategory>("all");
  const [zip,setZip]=useState("33511");
  const [radiusMiles,setRadiusMiles]=useState(25);
  const [sort,setSort]=useState<"default"|"discount"|"price">("default");
  const [kind,setKind]=useState<DiscoveryKind>("all");
  const [query,setQuery]=useState<DiscoveryQuery|null>(null);
  const [result,setResult]=useState<DiscoveryResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [failed,setFailed]=useState<"setup"|"failed"|"zipError"|"locationError"|"cooldown"|"retryExpired"|"databaseError"|"unsupportedLocation"|null>(null);
  const [attempt,setAttempt]=useState(0);
  const [ready,setReady]=useState(false);
  const [shareState,setShareState]=useState<"copied"|"copyHelp"|null>(null);
  const [shareUrl,setShareUrl]=useState("");
  useEffect(()=>{
    let saved:string|null=null;
    try { saved=localStorage.getItem(discoveryStorageKey); } catch { /* Storage may be disabled. */ }
    const settings=restoreSettings(window.location.search,saved);
    setRetailer(settings.retailer);setZip(settings.zip);setRadiusMiles(settings.radiusMiles);setCategory(settings.category);
    setKind(settings.kind);setSort(settings.sort);setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready||!/^\d{5}$/.test(zip))return;
    const settings={retailer,zip,radiusMiles,category,kind,sort};
    try {localStorage.setItem(discoveryStorageKey,JSON.stringify(settings));} catch { /* Search still works without storage. */ }
    // Keep refresh/bookmark behavior aligned with the controls, without navigation or fetches.
    try {window.history.replaceState(window.history.state,"",`/?${searchSettingsParams(settings)}`);} catch { /* URL updates are optional. */ }
    setShareState(null);setShareUrl("");
  },[ready,retailer,zip,radiusMiles,category,kind,sort]);
  async function shareSearch() {
    const url=`${window.location.origin}/?${searchSettingsParams({retailer,zip,radiusMiles,category,kind,sort})}`;
    setShareUrl(url);
    try {await navigator.clipboard.writeText(url);setShareState("copied");}
    catch {setShareState("copyHelp");}
  }
  function resetSettings() {
    const settings=defaultDiscoverySettings;
    setRetailer(settings.retailer);setZip(settings.zip);setRadiusMiles(settings.radiusMiles);setCategory(settings.category);
    setKind(settings.kind);setSort(settings.sort);setQuery(null);setResult(null);setFailed(null);
    setShareState(null);setShareUrl("");
  }

  useEffect(()=>{
    if(!query)return;
    const controller=new AbortController();let active=true;
    const timer=setTimeout(()=>controller.abort(),640000);
    setLoading(true);setFailed(null);if(!query.retryFailed)setResult(null);
    flipScoutApi.discoverDeals(query,controller.signal)
      .then(data=>{if(active)setResult(data);})
      .catch(e=>{if(active)setFailed(e?.code==="DISCOVERY_LOCATION_UNSUPPORTED"?"unsupportedLocation":e?.code?.startsWith("DISCOVERY_DATABASE")?"databaseError":e?.code==="DISCOVERY_RETRY_EXPIRED"?"retryExpired":e?.code==="DISCOVERY_COOLDOWN"?"cooldown":e?.code==="SERPAPI_KEY_MISSING"?"setup":e?.code==="ZIP_NOT_FOUND"?"zipError":e?.code==="ZIP_LOOKUP_UNAVAILABLE"?"locationError":"failed");})
      .finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
    return()=>{active=false;controller.abort();clearTimeout(timer);};
  },[query,attempt]);
  const deals=(result?.deals??[]).filter(deal=>kind==="all"||deal.kind===kind).sort((a,b)=>{
    if(sort==="price")return a.price-b.price||a.id.localeCompare(b.id);
    const percent=(d:typeof a)=>d.originalPrice&&d.originalPrice>d.price?(d.originalPrice-d.price)/d.originalPrice:-1;
    return sort==="discount"?percent(b)-percent(a)||a.id.localeCompare(b.id):0;
  });
  function chooseKind(next:DiscoveryKind) {
    setKind(next);
  }
  return <main className="min-w-0 flex-1 p-4 sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:hidden"><Link href="/" className="font-bold">FlipScout</Link><div className="flex gap-3 text-sm"><Link href="/stores">{t("nav.stores")}</Link><button type="button" onClick={()=>setLocale(locale==="en"?"vi":"en")}>{locale==="en"?"Tiếng Việt":"English"}</button></div></div>
    <p className="text-sm text-emerald-300">{retailer==="home-depot"?t("discover.location"):discoveryRetailers.find(r=>r.id===retailer)?.name}</p>
    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{t("discover.title")}</h1>
    <p className="mt-3 max-w-3xl text-neutral-400">{t("discover.retailerDescription")}</p>
    <form className="my-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={e=>{e.preventDefault();setQuery({retailer,category,kind:"all",page:1,zip,radiusMiles});}}>
      <label className="text-sm">{t("discover.retailer")}<select value={retailer} onChange={e=>{
        setRetailer(e.target.value as DiscoveryRetailer);setQuery(null);setResult(null);setFailed(null);setLoading(false);
      }} className="mt-2 w-full rounded-xl border border-white/20 bg-neutral-950 p-3">{discoveryRetailers.map(r=><option key={r.id} value={r.id}>{r.name}{r.id==="home-depot"?"":` — ${t("discover.onlineOffers")}`}</option>)}</select></label>
      <label className="text-sm">{t("discover.zip")}<input required pattern="[0-9]{5}" maxLength={5} inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e=>setZip(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-neutral-950 p-3" /></label>
      <label className="text-sm">{t("discover.radius")}<select disabled={retailer!=="home-depot"} value={radiusMiles} onChange={e=>setRadiusMiles(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/20 bg-neutral-950 p-3">{[5,10,15,20,25].map(n=><option key={n} value={n}>{n} {t("discover.miles")}</option>)}</select></label>
      <button type="submit" disabled={loading||!ready} className={`${button} mt-auto bg-emerald-400 font-semibold text-black`}>{t(loading?"discover.loading":"discover.search")}</button>
    </form>
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("discover.kind")}>
      {(["all","sale","clearance","penny"] as const).map(k=><button key={k} type="button" disabled={!ready} aria-pressed={kind===k} onClick={()=>chooseKind(k)} className={`rounded-full px-5 py-3 text-sm transition disabled:opacity-40 ${kind===k?"bg-blue-500 text-white":"bg-white/5 text-neutral-300 hover:bg-white/10"}`}>{t(`discover.${k}`)}</button>)}
      {(["discount","price"] as const).map(value=><button key={value} type="button" aria-pressed={sort===value} onClick={()=>setSort(sort===value?"default":value)} className={`rounded-full border px-5 py-3 text-sm ${sort===value?"border-blue-400 bg-blue-500/20 text-blue-200":"border-white/10 text-neutral-300"}`}>{t(value==="discount"?"discover.highest":"discover.lowest")}</button>)}
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button type="button" className={button} disabled={!ready||!/^\d{5}$/.test(zip)} onClick={()=>void shareSearch()}>{t("discover.share")}</button>
      <button type="button" className={button} disabled={loading||!ready} onClick={resetSettings}>{t("discover.reset")}</button>
      <span className="text-xs text-neutral-400">{t("discover.savedHelp")}</span>
    </div>
    <div role="status" className="mb-3 text-sm text-neutral-300">
      {shareState&&<p>{t(`discover.${shareState}`)}</p>}
      {shareState==="copyHelp"&&<input aria-label={t("discover.share")} readOnly value={shareUrl} onFocus={e=>e.target.select()} className="mt-2 w-full rounded-lg border border-white/20 bg-neutral-950 p-3" />}
    </div>
    <p className="mb-3 text-xs text-neutral-400">{t("discover.sortHelp")}</p>
    <p className="mb-5 text-xs leading-5 text-neutral-400">{t(retailer==="home-depot"?"discover.coverage":retailer==="walmart"?"discover.walmartCoverage":"discover.shoppingCoverage")}</p>
    <div aria-live="polite" aria-busy={loading}>
      {!query&&<div className="rounded-2xl border border-dashed border-white/20 p-8"><h2 className="text-lg font-medium">{t("discover.start")}</h2><p className="mt-2 text-sm text-neutral-400">{t("discover.startHelp")}</p></div>}
      {loading&&<p className="py-12 text-neutral-400">{t("discover.wait")}</p>}
      {failed&&<div role="alert" className="rounded-xl bg-amber-500/10 p-5 text-amber-200"><p>{t(`discover.${failed}`)}</p><button type="button" className={`${button} mt-4`} onClick={()=>setAttempt(n=>n+1)}>{t("inventory.retry")}</button></div>}
      {result&&<>
        {result.source!=="serpapi-home-depot"&&<p className="mb-4 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4 text-sm text-blue-200">{result.retailer} · {t("discover.onlineOffers")} · ZIP {result.query.zip}</p>}
        {result.cache&&<p className="mb-4 text-xs text-neutral-400">{t(result.cache.source==="database"?"discover.cached":"discover.liveSaved")} · {t("discover.expires")}: {new Date(result.cache.expiresAt).toLocaleString("en-US")}</p>}
        {result.diagnostics&&<details className="mb-4 rounded-xl border border-white/10 p-4 text-sm text-neutral-400"><summary className="cursor-pointer">{t("discover.searchDetails")}</summary><p className="mt-3">{result.diagnostics.merchantMatched} {t("discover.merchantMatched")} · {result.diagnostics.wrongMerchant} {t("discover.wrongMerchant")} · {result.diagnostics.notDiscounted} {t("discover.notDiscounted")}</p></details>}
        {result.coverage?.groups&&<details className="mb-4 rounded-xl border border-white/10 p-4 text-sm">
          <summary className="cursor-pointer text-neutral-300">{t("discover.searchDetails")} · {result.coverage.completed}/{result.coverage.total} {t("discover.groupsChecked")}</summary>
          <ul className="mt-3 space-y-2">{result.coverage.groups.map(group=><li key={group.category} className="flex flex-wrap justify-between gap-2 text-neutral-400"><span>{t(`discover.${group.category}`)}</span><span>{group.status==="success"?`${group.productsChecked} ${t("discover.checked")}`:t("discover.groupFailed")}</span></li>)}</ul>
        </details>}
        {result.coverage&&result.coverage.failed>0&&<div role="status" className="mb-4 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200"><p>{t("discover.partial")} ({result.coverage.completed}/{result.coverage.total})</p></div>}
        {result.location&&<p className="mb-4 rounded-xl border border-white/10 p-4 text-sm text-neutral-300">ZIP {result.location.zip} · {result.location.radiusMiles} {t("discover.miles")} · {result.location.covered?`Home Depot #6305 · ${result.location.distanceMiles} ${t("discover.approx")}`:t("discover.noCoverage")}</p>}
        <div className="mb-4 text-sm text-neutral-400"><p>{t(`discover.${kind}`)} · {deals.length} {t("discover.matches")} · {t("find.page")} {result.query.page}</p><p className="mt-1 text-xs">{t("discover.fetched")}: {new Date(result.fetchedAt).toLocaleString("en-US")}{result.providerCreatedAt?` · ${t("discover.sourceTime")}: ${new Date(result.providerCreatedAt).toLocaleString("en-US")}`:""}</p></div>
        {deals.length===0&&result.location?.covered!==false&&<p className="rounded-xl border border-white/10 p-6 text-neutral-400">{t("discover.empty")}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{deals.map(deal=><article key={deal.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          {deal.imageUrl&&<div className="flex h-44 items-center justify-center bg-white p-4"><img src={deal.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" /></div>}
          <div className="flex flex-1 flex-col p-5"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{t(`discover.${deal.kind}`)}</span><h2 className="mt-2 font-semibold leading-6">{deal.title}</h2><div className="mt-4 flex items-baseline gap-3"><strong className="text-3xl">{money(deal.price)}</strong>{deal.originalPrice!==null&&<del className="text-sm text-neutral-500">{money(deal.originalPrice)}</del>}</div>
          {deal.savings!==null&&<p className="mt-2 text-sm text-emerald-300">{t("discover.save")} {money(deal.savings)}</p>}
          <p className="mt-4 text-xs text-neutral-400">{result.retailer} · {result.storeId?`${result.storeName} #${result.storeId}`:t("discover.onlineOffers")}</p><p className="mt-2 text-xs text-neutral-400">{deal.pickupStatus==="local"?`${t("discover.localStock")}: ${deal.quantity}`:deal.pickupStatus==="ship-to-store"?t("discover.shipToStore"):deal.pickupStatus==="other-store"?t("discover.otherStore"):deal.pickupText??t("discover.unknown")}</p>
          {deal.kind==="penny"&&<p className="mt-3 text-xs text-amber-200">{t("discover.verifyPenny")}</p>}
          <a href={deal.productUrl} target="_blank" rel="noopener noreferrer" className={`${button} mt-5 text-center`}>{result.source==="serpapi-google-shopping"?t("discover.viewOffer"):`${t("discover.viewRetailer")} ${result.retailer}`}</a></div>
        </article>)}</div>
        <nav className="my-6 flex items-center justify-between" aria-label={t("find.page")}><button type="button" className={button} disabled={loading||result.query.page===1} onClick={()=>setQuery({...result.query,page:result.query.page-1})}>{t("find.previous")}</button><button type="button" className={button} disabled={loading||!result.hasMore} onClick={()=>setQuery({...result.query,page:result.query.page+1})}>{t("find.next")}</button></nav>
        <p className="text-xs text-neutral-500">{result.productsChecked} {t("discover.checked")}{result.skippedProducts>0?` · ${result.skippedProducts} ${t("discover.skipped")}`:""}</p>
      </>}
    </div>
  </div></main>;
}
