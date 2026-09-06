"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { categories, retailers } from "@/lib/mock-deals";

interface DealFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  retailer: string;
  onRetailerChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
}

export function DealFilters({ query, onQueryChange, retailer, onRetailerChange, category, onCategoryChange }: DealFiltersProps) {
  return (
    <div className="filters">
      <label className="search-wrap">
        <Search size={17} />
        <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search product, brand, or store..." className="search-input" />
      </label>
      <select value={retailer} onChange={(e) => onRetailerChange(e.target.value)} className="select">
        {retailers.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select value={category} onChange={(e) => onCategoryChange(e.target.value)} className="select">
        {categories.map((item) => <option key={item}>{item}</option>)}
      </select>
      <button className="secondary-button"><SlidersHorizontal size={16} />More filters</button>
    </div>
  );
}
