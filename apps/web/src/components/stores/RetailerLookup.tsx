"use client";
import { useEffect, useRef, useState } from "react";
import type { RetailerAvailabilityResponse } from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";
import { useI18n } from "@/components/i18n/I18nProvider";
const money=(v: number | null) => v===null ? "—" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v);
export function RetailerLookup() {
  const {t}=useI18n();
  const [zip,setZip]=useState(""); const [sku,setSku]=useState("");
  const [result,setResult]=useState<RetailerAvailabilityResponse|null>(null);
  const [loading,setLoading]=useState(false); const [error,setError]=useState<"retailer.setup"|"retailer.failed"|null>(null);
  const request=useRef<AbortController|null>(null);
  const version=useRef(0);
  useEffect(()=>()=>{version.current++;request.current?.abort();},[]);
  function reset() { version.current++; request.current?.abort(); setResult(null); setError(null); setLoading(false); }
  async function lookup() {
    reset(); const current=version.current; const controller=new AbortController();request.current=controller;
    const timer=setTimeout(()=>controller.abort(),120000);setLoading(true);
    try { const data=await flipScoutApi.getBestBuyAvailability(zip,sku,controller.signal); if(version.current===current)setResult(data); }
    catch(e) { if(version.current===current) setError(e && typeof e==="object" && "code" in e && e.code==="RETAILER_NOT_CONFIGURED" ? "retailer.setup" : "retailer.failed"); }
    finally { clearTimeout(timer); if(version.current===current)setLoading(false); }
  }
  return <section className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5" aria-labelledby="retailer-title">
    <h2 id="retailer-title" className="text-xl font-semibold">{t("retailer.title")}</h2>
    <p className="mt-2 text-sm text-neutral-400">{t("retailer.description")}</p>
    <form className="my-4 flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void lookup();}}>
      <label className="text-sm">{t("retailer.zip")}<input required pattern="[0-9]{5}" maxLength={5} inputMode="numeric" value={zip} onChange={e=>{reset();setZip(e.target.value);}} className="mt-2 block rounded-xl border border-white/20 bg-neutral-950 p-3" /></label>
      <label className="text-sm">{t("retailer.sku")}<input required pattern="[0-9]{1,16}" maxLength={16} inputMode="numeric" value={sku} onChange={e=>{reset();setSku(e.target.value);}} className="mt-2 block rounded-xl border border-white/20 bg-neutral-950 p-3" /></label>
      <button type="submit" disabled={loading} className="rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-black disabled:opacity-40">{t(loading?"find.loading":"retailer.lookup")}</button>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {error && <p role="alert" className="text-sm text-amber-200">{t(error)}</p>}
      {result && <>
        <h3 className="font-semibold">{result.productName}</h3>
        <p className="my-2 text-sm">{t("retailer.price")}: {money(result.salePrice)} · {t("retailer.regular")}: {money(result.regularPrice)}</p>
        <p className="mb-3 text-xs text-neutral-400">{t("retailer.observed")}: {new Date(result.observedAt).toLocaleString("en-US")}</p>
        {result.stores.length===0 && <p>{t("retailer.empty")}</p>}
        <ul className="grid gap-3 md:grid-cols-2">{result.stores.map(s=><li key={s.id} className="rounded-xl border border-white/10 p-3"><p className="font-medium">Best Buy · {s.name}</p><p className="mt-1 text-sm text-neutral-400">{s.city}, {s.state}{s.distanceMiles!==null?` · ${s.distanceMiles.toFixed(1)} mi`:""}</p><p className="mt-2 text-sm text-emerald-300">{t(s.lowStock?"retailer.low":"retailer.available")}</p></li>)}</ul>
      </>}
    </div>
    <p className="mt-4 text-xs leading-5 text-neutral-400">{t("retailer.limits")}</p>
  </section>;
}
