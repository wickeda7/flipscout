"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, Flame, PackageSearch, Store } from "lucide-react";
import { DealCard } from "@/components/dashboard/DealCard";
import { DealFilters } from "@/components/dashboard/DealFilters";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockDeals } from "@/lib/mock-deals";

export function Dashboard() {
  const [query, setQuery] = useState("");
  const [retailer, setRetailer] = useState("All stores");
  const [category, setCategory] = useState("All categories");

  const filteredDeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mockDeals.filter((deal) => {
      const matchesQuery = !normalizedQuery || [deal.productName, deal.brand, deal.retailer, deal.storeName, deal.city, deal.category]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesRetailer = retailer === "All stores" || deal.retailer === retailer;
      const matchesCategory = category === "All categories" || deal.category === category;
      return matchesQuery && matchesRetailer && matchesCategory;
    });
  }, [query, retailer, category]);

  const totalProfit = filteredDeals.reduce((sum, deal) => sum + deal.estimatedProfit, 0);
  const strongBuys = filteredDeals.filter((deal) => deal.buyScore >= 90).length;
  const inventory = filteredDeals.reduce((sum, deal) => sum + deal.inventory, 0);
  const uniqueStores = new Set(filteredDeals.map((deal) => deal.storeName)).size;

  return (
    <main className="main">
      <div className="container">
        <header className="header">
          <div>
            <p className="date">Saturday, September 5</p>
            <h1 className="title">Today&apos;s opportunities</h1>
            <p className="subtitle">Clearance inventory ranked by expected resale value.</p>
          </div>
          <button className="primary-button">Scan nearby stores</button>
        </header>

        <section className="kpi-grid">
          <KpiCard label="Potential profit" value={`$${totalProfit.toFixed(0)}`} helper="across filtered deals" icon={CircleDollarSign} />
          <KpiCard label="Strong buys" value={String(strongBuys)} helper="score 90 or higher" icon={Flame} />
          <KpiCard label="Units available" value={String(inventory)} helper="reported local inventory" icon={PackageSearch} />
          <KpiCard label="Stores" value={String(uniqueStores)} helper="with matching opportunities" icon={Store} />
        </section>

        <DealFilters query={query} onQueryChange={setQuery} retailer={retailer} onRetailerChange={setRetailer} category={category} onCategoryChange={setCategory} />

        <section>
          <div className="section-head">
            <div>
              <h2 className="section-title">Best deals</h2>
              <p className="section-meta">{filteredDeals.length} opportunities found</p>
            </div>
            <select className="sort-select">
              <option>Highest buy score</option>
              <option>Highest profit</option>
              <option>Highest ROI</option>
              <option>Nearest first</option>
            </select>
          </div>

          <div className="deals-list">
            {filteredDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
            {filteredDeals.length === 0 && <div className="empty">No deals match these filters.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
