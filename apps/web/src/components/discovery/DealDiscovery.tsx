"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { DiscoveryCategory, DiscoveryKind, DiscoveryQuery, DiscoveryResponse } from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";
import { useI18n } from "@/components/i18n/I18nProvider";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const button="rounded-xl border border-white/20 px-4 py-3 text-sm disabled:opacity-40";
export function DealDiscovery() {
  const {t,locale,setLocale}=useI18n();
  const [category,setCategory]=useState<DiscoveryCategory>("tools");
  const [kind,setKind]=useState<DiscoveryKind>("all");
  const [query,setQuery]=useState<DiscoveryQuery|null>(null);
  const [result,setResult]=useState<DiscoveryResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [failed,setFailed]=useState<"setup"|"failed"|null>(null);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!query)return;
    const controller=new AbortController();let active=true;
    const timer=setTimeout(()=>controller.abort(),115000);
    setLoading(true);setFailed(null);setResult(null);
    flipScoutApi.discoverHomeDepot(query,controller.signal)
      .then(data=>{if(active)setResult(data);})
      .catch(e=>{if(active)setFailed(e?.code==="SERPAPI_KEY_MISSING"?"setup":"failed");})
      .finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
    return()=>{active=false;controller.abort();clearTimeout(timer);};
  },[query,attempt]);
  return <main className="min-w-0 flex-1 p-4 sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:hidden"><Link href="/" className="font-bold">FlipScout</Link><div className="flex gap-3 text-sm"><Link href="/stores">{t("nav.stores")}</Link><button type="button" onClick={()=>setLocale(locale==="en"?"vi":"en")}>{locale==="en"?"Tiếng Việt":"English"}</button></div></div>
    <p className="text-sm text-emerald-300">{t("discover.location")}</p>
    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{t("discover.title")}</h1>
    <p className="mt-3 max-w-3xl text-neutral-400">{t("discover.description")}</p>
    <form className="my-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();setQuery({category,kind,page:1});}}>
      <label className="text-sm">{t("discover.category")}<select className="mt-2 w-full rounded-xl border border-white/20 bg-neutral-950 p-3" value={category} onChange={e=>setCategory(e.target.value as DiscoveryCategory)}>{(["tools","appliances","lighting","garden","storage"] as const).map(c=><option key={c} value={c}>{t(`discover.${c}`)}</option>)}</select></label>
      <label className="text-sm">{t("discover.kind")}<select className="mt-2 w-full rounded-xl border border-white/20 bg-neutral-950 p-3" value={kind} onChange={e=>setKind(e.target.value as DiscoveryKind)}>{(["all","sale","clearance","penny"] as const).map(k=><option key={k} value={k}>{t(`discover.${k}`)}</option>)}</select></label>
      <button type="submit" disabled={loading} className={`${button} mt-auto bg-emerald-400 font-semibold text-black`}>{t(loading?"discover.loading":"discover.search")}</button>
    </form>
    <p className="mb-5 text-xs leading-5 text-neutral-400">{t("discover.coverage")}</p>
    <div aria-live="polite" aria-busy={loading}>
      {!query&&<div className="rounded-2xl border border-dashed border-white/20 p-8"><h2 className="text-lg font-medium">{t("discover.start")}</h2><p className="mt-2 text-sm text-neutral-400">{t("discover.startHelp")}</p></div>}
      {loading&&<p className="py-12 text-neutral-400">{t("discover.wait")}</p>}
      {failed&&<div role="alert" className="rounded-xl bg-amber-500/10 p-5 text-amber-200"><p>{t(failed==="setup"?"discover.setup":"discover.failed")}</p><button type="button" className={`${button} mt-4`} onClick={()=>setAttempt(n=>n+1)}>{t("inventory.retry")}</button></div>}
      {result&&<>
        <div className="mb-4 text-sm text-neutral-400"><p>{t(`discover.${result.query.category}`)} · {t(`discover.${result.query.kind}`)} · {result.deals.length} {t("discover.matches")} · {t("find.page")} {result.query.page}</p><p className="mt-1 text-xs">{t("discover.fetched")}: {new Date(result.fetchedAt).toLocaleString("en-US")}{result.providerCreatedAt?` · ${t("discover.sourceTime")}: ${new Date(result.providerCreatedAt).toLocaleString("en-US")}`:""}</p></div>
        {result.deals.length===0&&<p className="rounded-xl border border-white/10 p-6 text-neutral-400">{t("discover.empty")}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.deals.map(deal=><article key={deal.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          {deal.imageUrl&&<div className="flex h-44 items-center justify-center bg-white p-4"><img src={deal.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" /></div>}
          <div className="flex flex-1 flex-col p-5"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{t(`discover.${deal.kind}`)}</span><h2 className="mt-2 font-semibold leading-6">{deal.title}</h2><div className="mt-4 flex items-baseline gap-3"><strong className="text-3xl">{money(deal.price)}</strong>{deal.originalPrice!==null&&<del className="text-sm text-neutral-500">{money(deal.originalPrice)}</del>}</div>
          {deal.savings!==null&&<p className="mt-2 text-sm text-emerald-300">{t("discover.save")} {money(deal.savings)}</p>}
          <p className="mt-4 text-xs text-neutral-400">Home Depot · {result.storeName} #{result.storeId}</p><p className="mt-2 text-xs text-neutral-400">{deal.pickupText??t("discover.unknown")}</p>
          {deal.kind==="penny"&&<p className="mt-3 text-xs text-amber-200">{t("discover.verifyPenny")}</p>}
          <a href={deal.productUrl} target="_blank" rel="noopener noreferrer" className={`${button} mt-5 text-center`}>{t("discover.open")}</a></div>
        </article>)}</div>
        <nav className="my-6 flex items-center justify-between" aria-label={t("find.page")}><button type="button" className={button} disabled={result.query.page===1} onClick={()=>setQuery({...result.query,page:result.query.page-1})}>{t("find.previous")}</button><button type="button" className={button} disabled={!result.hasMore} onClick={()=>setQuery({...result.query,page:result.query.page+1})}>{t("find.next")}</button></nav>
        <p className="text-xs text-neutral-500">{result.productsChecked} {t("discover.checked")}{result.skippedProducts>0?` · ${result.skippedProducts} ${t("discover.skipped")}`:""}</p>
      </>}
    </div>
  </div></main>;
}
