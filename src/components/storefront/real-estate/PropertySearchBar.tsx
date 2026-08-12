"use client";

import { Search } from "lucide-react";

export type PropertyFilterState = {
  listingMode: "buy" | "rent" | "sold";
  location: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
};

export function PropertySearchBar({
  filters,
  propertyTypes,
  onChange,
  onSubmit,
}: {
  filters: PropertyFilterState;
  propertyTypes: string[];
  onChange: (next: PropertyFilterState) => void;
  onSubmit: () => void;
}) {
  const update = <K extends keyof PropertyFilterState>(key: K, value: PropertyFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-[28px] border border-[#dce8dd] bg-white p-4 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-card">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["buy", "rent", "sold"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => update("listingMode", mode)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filters.listingMode === mode ? "bg-[#1f9b46] text-white" : "bg-[#f3f8f2] text-slate-700 dark:bg-secondary/40 dark:text-muted-foreground"}`}
          >
            {mode === "buy" ? "Buy" : mode === "rent" ? "Rent" : "Sold"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-[1.3fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr_auto]">
        <input
          value={filters.location}
          onChange={(event) => update("location", event.target.value)}
          placeholder="City, neighborhood, or zip"
          className="col-span-2 rounded-[18px] border border-[#dce8dd] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 xl:col-span-1 dark:border-white/10 dark:bg-card dark:text-foreground"
        />
        <select
          value={filters.propertyType}
          onChange={(event) => update("propertyType", event.target.value)}
          className="rounded-[18px] border border-[#dce8dd] bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-card dark:text-foreground"
        >
          <option value="all">Any type</option>
          {propertyTypes.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <input
          value={filters.minPrice}
          onChange={(event) => update("minPrice", event.target.value)}
          placeholder="$ Min"
          className="rounded-[18px] border border-[#dce8dd] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-card dark:text-foreground"
        />
        <input
          value={filters.maxPrice}
          onChange={(event) => update("maxPrice", event.target.value)}
          placeholder="$ Max"
          className="rounded-[18px] border border-[#dce8dd] bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-card dark:text-foreground"
        />
        <select
          value={filters.beds}
          onChange={(event) => update("beds", event.target.value)}
          className="rounded-[18px] border border-[#dce8dd] bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-card dark:text-foreground"
        >
          <option value="any">Beds</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={String(value)}>{value}+</option>
          ))}
        </select>
        <select
          value={filters.baths}
          onChange={(event) => update("baths", event.target.value)}
          className="rounded-[18px] border border-[#dce8dd] bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-card dark:text-foreground"
        >
          <option value="any">Baths</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={String(value)}>{value}+</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSubmit}
          className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-[#1f9b46] px-5 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(31,155,70,0.55)] xl:col-span-1"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>
    </div>
  );
}
