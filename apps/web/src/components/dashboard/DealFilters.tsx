"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

interface DealFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  retailer: string;
  onRetailerChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  retailers: string[];
  categories: string[];
}

export function DealFilters({
  query,
  onQueryChange,
  retailer,
  onRetailerChange,
  category,
  onCategoryChange,
  retailers,
  categories,
}: DealFiltersProps) {
  const { t } = useI18n();
  const selectClass =
    "rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-neutral-300 outline-none transition focus:border-white/25";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 xl:flex-row">
      <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black px-3 transition focus-within:border-white/25">
        <Search size={17} className="shrink-0 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          className="w-full bg-transparent py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
        />
      </label>

      <select
        value={retailer}
        onChange={(e) => onRetailerChange(e.target.value)}
        className={selectClass}
      >
        <option value="__all__">{t("filters.allStores")}</option>
        {retailers.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={selectClass}
      >
        <option value="__all__">{t("filters.allCategories")}</option>
        {categories.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
      >
        <SlidersHorizontal size={16} />
        {t("filters.more")}
      </button>
    </div>
  );
}
