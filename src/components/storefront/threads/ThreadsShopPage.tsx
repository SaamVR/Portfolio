"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Filter,
  Leaf,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import RecentlyViewed from "@/components/RecentlyViewed";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProducts, useProductSearch } from "@/hooks/useProducts";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import {
  buildShopOptions,
  filterAndSortProducts,
  type ShopSortOption,
} from "@/lib/shop-filters";

const sortOptions: Array<{ value: ShopSortOption; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name" },
];

function parseList(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function uniqueOptions(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))).sort((a, b) => a.localeCompare(b));
}

function setParam(params: URLSearchParams, key: string, value: string | null) {
  const next = new URLSearchParams(params);
  if (!value || !value.trim()) next.delete(key);
  else next.set(key, value);
  next.delete("page");
  return next;
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/75 hover:border-primary/60"
      }`}
    >
      {active ? <Check className="h-3 w-3" /> : null}
      {label}
    </button>
  );
}

function ThreadsFilters({
  sizes,
  colors,
  selectedSizes,
  selectedColors,
  minPrice,
  maxPrice,
  saleOnly,
  onToggleSize,
  onToggleColor,
  onMinPrice,
  onMaxPrice,
  onSaleOnly,
  onClear,
}: {
  sizes: string[];
  colors: string[];
  selectedSizes: string[];
  selectedColors: string[];
  minPrice: string;
  maxPrice: string;
  saleOnly: boolean;
  onToggleSize: (value: string) => void;
  onToggleColor: (value: string) => void;
  onMinPrice: (value: string) => void;
  onMaxPrice: (value: string) => void;
  onSaleOnly: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-[.14em]">Refine</p>
        </div>
        <button type="button" onClick={onClear} className="text-[9px] font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary">
          Clear all
        </button>
      </div>

      <div>
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[.12em] text-primary">Price</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5">
            <span className="text-[8px] text-muted-foreground">Minimum</span>
            <input
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => onMinPrice(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="৳0"
              className="h-11 w-full rounded-[3px] border border-border bg-background px-3 text-[11px] outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[8px] text-muted-foreground">Maximum</span>
            <input
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => onMaxPrice(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="Any"
              className="h-11 w-full rounded-[3px] border border-border bg-background px-3 text-[11px] outline-none focus:border-primary"
            />
          </label>
        </div>
      </div>

      {sizes.length > 0 ? (
        <div>
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[.12em] text-primary">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <FilterOption key={size} label={size} active={selectedSizes.includes(size)} onClick={() => onToggleSize(size)} />
            ))}
          </div>
        </div>
      ) : null}

      {colors.length > 0 ? (
        <div>
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[.12em] text-primary">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <FilterOption key={color} label={color} active={selectedColors.includes(color)} onClick={() => onToggleColor(color)} />
            ))}
          </div>
        </div>
      ) : null}

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border pt-4 text-[10px] font-semibold">
        <span>Sale items only</span>
        <input type="checkbox" checked={saleOnly} onChange={onSaleOnly} className="h-4 w-4 accent-primary" />
      </label>
    </div>
  );
}

export function ThreadsShopPage({ explicitStoreId }: { explicitStoreId?: string }) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id;
  const { trackEvent } = useStorefrontAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const analyticsSnapshotRef = useRef("");
  const { data: products = [], isLoading } = useProducts(storeId);
  const { data: categoryRows = [] } = useProductCategories(storeId);

  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "All";
  const saleOnly = searchParams.get("sale") === "1";
  const minPrice = searchParams.get("min") ?? "";
  const maxPrice = searchParams.get("max") ?? "";
  const selectedSizes = parseList(searchParams.get("size"));
  const selectedColors = parseList(searchParams.get("color"));
  const requestedSort = searchParams.get("sort") as ShopSortOption | null;
  const sort = sortOptions.some((option) => option.value === requestedSort) ? requestedSort! : "newest";

  const availableProducts = useMemo(
    () => products.filter((product) => product.isAvailable !== false),
    [products],
  );
  const categories = useMemo(
    () => buildShopOptions(
      availableProducts,
      "category",
      categoryRows.map((row) => row.name).filter(Boolean) as string[],
    ),
    [availableProducts, categoryRows],
  );
  const sizes = useMemo(
    () => uniqueOptions(availableProducts.flatMap((product) => product.sizes ?? [])),
    [availableProducts],
  );
  const colors = useMemo(
    () => uniqueOptions(availableProducts.flatMap((product) => product.colors ?? [])),
    [availableProducts],
  );

  const { data: indexedSearchProducts = null, isLoading: isSearchLoading } = useProductSearch(
    {
      query,
      category: category !== "All" ? category : null,
      minPrice,
      maxPrice,
      saleOnly,
      perPage: 96,
    },
    storeId,
  );

  const sourceProducts = query.trim() && indexedSearchProducts ? indexedSearchProducts : availableProducts;
  const filteredProducts = useMemo(
    () => filterAndSortProducts(sourceProducts, {
      query,
      type: "All",
      category,
      sort,
      saleOnly,
      minPrice,
      maxPrice,
      selectedSizes,
      selectedColors,
    }),
    [category, maxPrice, minPrice, query, saleOnly, selectedColors, selectedSizes, sort, sourceProducts],
  );

  const paramSnapshot = searchParams.toString();
  useEffect(() => {
    setDisplayCount(12);
  }, [paramSnapshot]);

  useEffect(() => {
    if (analyticsSnapshotRef.current === paramSnapshot) return;
    analyticsSnapshotRef.current = paramSnapshot;

    if (query.trim()) {
      trackEvent({
        eventName: "search",
        eventCategory: "discovery",
        searchQuery: query.trim(),
        metadata: {
          resultsCount: filteredProducts.length,
          activeCategory: category,
          sort,
          source: "threads_shop_page",
          searchBackend: indexedSearchProducts ? "postgres_index" : "supabase_fallback",
        },
      });
    }

    if (category !== "All") {
      trackEvent({
        eventName: "tag_click",
        eventCategory: "discovery",
        metadata: {
          tag: category,
          tagType: "category",
          source: "threads_shop_page_filter",
        },
      });
    }

    const activeFilters = [
      category !== "All" ? `category:${category}` : "",
      saleOnly ? "sale:1" : "",
      minPrice ? `min:${minPrice}` : "",
      maxPrice ? `max:${maxPrice}` : "",
      ...selectedSizes.map((value) => `size:${value}`),
      ...selectedColors.map((value) => `color:${value}`),
    ].filter(Boolean);

    if (activeFilters.length > 0) {
      trackEvent({
        eventName: "filter_used",
        eventCategory: "discovery",
        metadata: {
          filters: activeFilters,
          resultsCount: filteredProducts.length,
          source: "threads_shop_page",
        },
      });
    }

    if (sort !== "newest") {
      trackEvent({
        eventName: "sort_changed",
        eventCategory: "discovery",
        metadata: {
          sort,
          resultsCount: filteredProducts.length,
          source: "threads_shop_page",
        },
      });
    }
  }, [
    category,
    filteredProducts.length,
    indexedSearchProducts,
    maxPrice,
    minPrice,
    paramSnapshot,
    query,
    saleOnly,
    selectedColors,
    selectedSizes,
    sort,
    trackEvent,
  ]);

  const updateParam = (key: string, value: string | null) => setSearchParams(setParam(searchParams, key, value));
  const toggleListParam = (key: "size" | "color", value: string) => {
    const current = new Set(parseList(searchParams.get(key)));
    if (current.has(value)) current.delete(value);
    else current.add(value);
    updateParam(key, current.size ? Array.from(current).join(",") : null);
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ["category", "sale", "min", "max", "size", "color", "sort", "page"].forEach((key) => next.delete(key));
    setSearchParams(next);
  };
  const resetCollection = () => {
    const next = new URLSearchParams(searchParams);
    ["q", "category", "sale", "min", "max", "size", "color", "sort", "page"].forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  const activeFilterCount = [
    category !== "All",
    saleOnly,
    Boolean(minPrice),
    Boolean(maxPrice),
    selectedSizes.length > 0,
    selectedColors.length > 0,
  ].filter(Boolean).length;
  const displayedProducts = filteredProducts.slice(0, displayCount);
  const loading = isLoading || (query.trim() ? isSearchLoading : false);
  const brand = store?.id === "preview-threads" ? "CHAPCHITRA" : store?.name || "Threads";

  return (
    <StorefrontLayout>
      {!explicitStoreId ? (
        <SEOHead
          title="Shop"
          description={`Browse ${brand} products and collections.`}
          canonical={absoluteStoreUrl(store, "/shop")}
        />
      ) : null}

      <section className="border-b border-border/60 bg-secondary/35">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden px-4 py-8 sm:px-5 md:px-8 md:py-11">
          <Leaf className="pointer-events-none absolute -right-5 -top-8 h-40 w-40 rotate-[18deg] stroke-[.65] text-primary/10" />
          <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[.22em] text-primary">The collection</p>
              <h1 className="mt-2 font-serif text-[42px] font-semibold leading-[.86] tracking-[-.05em] sm:text-[50px] md:text-[62px]">
                Shop the Story
              </h1>
              <p className="mt-3 max-w-[510px] text-[10px] leading-5 text-foreground/65 md:text-[11px]">
                Explore original graphics, grounded colors, and everyday pieces designed to carry a little more meaning.
              </p>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
              {loading ? "Loading collection" : `${filteredProducts.length} pieces`}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background py-6 md:py-8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
          <div className="border-b border-border pb-4">
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => updateParam("category", item.value === "All" ? null : item.value)}
                  className={`min-h-11 shrink-0 border-b-2 px-3 text-[9px] font-bold uppercase tracking-[.08em] transition sm:px-4 ${
                    category === item.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label} <span className="ml-1 opacity-55">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-b border-border py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
            <label className="relative block max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => updateParam("q", event.target.value || null)}
                placeholder="Search the collection"
                className="h-11 w-full rounded-[3px] border border-border bg-background pl-10 pr-4 text-[11px] outline-none transition focus:border-primary"
              />
            </label>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[3px] border border-border bg-background px-4 text-[9px] font-bold uppercase tracking-[.08em] transition hover:border-primary"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[8px] text-primary-foreground">{activeFilterCount}</span>
              ) : null}
            </button>

            <label className="relative">
              <select
                value={sort}
                onChange={(event) => updateParam("sort", event.target.value === "newest" ? null : event.target.value)}
                className="h-11 w-full appearance-none rounded-[3px] border border-border bg-background pl-4 pr-10 text-[9px] font-bold uppercase tracking-[.06em] outline-none transition focus:border-primary md:w-[180px]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>

          {query || activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 py-3 text-[9px]">
              <span className="font-semibold text-muted-foreground">Active:</span>
              {query ? (
                <button type="button" onClick={() => updateParam("q", null)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3">
                  “{query}” <X className="h-3 w-3" />
                </button>
              ) : null}
              {category !== "All" ? (
                <button type="button" onClick={() => updateParam("category", null)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3">
                  {category} <X className="h-3 w-3" />
                </button>
              ) : null}
              {activeFilterCount > (category !== "All" ? 1 : 0) ? (
                <button type="button" onClick={clearFilters} className="min-h-9 px-2 font-semibold text-primary underline underline-offset-4">Clear filters</button>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="grid min-h-[360px] place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="my-8 rounded-[6px] border border-dashed border-border bg-secondary/30 px-5 py-16 text-center">
              <p className="font-serif text-[28px] font-semibold">Nothing here yet</p>
              <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-muted-foreground">Try another category, remove a filter, or search for something different.</p>
              <button type="button" onClick={resetCollection} className="mt-5 inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[9px] font-bold uppercase tracking-[.08em] text-primary-foreground">
                Reset collection
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 py-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 md:gap-y-9">
                {displayedProducts.map((product) => (
                  <ThreadsProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="border-t border-border pt-5 text-center">
                <p className="mb-3 text-[9px] text-muted-foreground">Showing {displayedProducts.length} of {filteredProducts.length}</p>
                {displayedProducts.length < filteredProducts.length ? (
                  <button
                    type="button"
                    onClick={() => setDisplayCount((count) => count + 12)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[3px] border border-primary px-5 text-[9px] font-bold uppercase tracking-[.08em] text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    Load more <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <p className="text-[9px] font-semibold uppercase tracking-[.1em] text-primary">You’ve reached the end</p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-5 md:px-8 md:pb-14">
        <RecentlyViewed title="Recently viewed" />
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[100]">
          <button type="button" className="absolute inset-0 bg-foreground/35 backdrop-blur-[1px]" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />
          <aside className="absolute inset-y-0 right-0 flex w-[92%] max-w-[390px] flex-col bg-background shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-border px-5">
              <p className="font-serif text-[24px] font-semibold">Refine collection</p>
              <button type="button" onClick={() => setFiltersOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close filters">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ThreadsFilters
                sizes={sizes}
                colors={colors}
                selectedSizes={selectedSizes}
                selectedColors={selectedColors}
                minPrice={minPrice}
                maxPrice={maxPrice}
                saleOnly={saleOnly}
                onToggleSize={(value) => toggleListParam("size", value)}
                onToggleColor={(value) => toggleListParam("color", value)}
                onMinPrice={(value) => updateParam("min", value || null)}
                onMaxPrice={(value) => updateParam("max", value || null)}
                onSaleOnly={() => updateParam("sale", saleOnly ? null : "1")}
                onClear={clearFilters}
              />
            </div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[3px] bg-primary px-5 text-[9px] font-bold uppercase tracking-[.1em] text-primary-foreground"
              >
                View {filteredProducts.length} results
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </StorefrontLayout>
  );
}
