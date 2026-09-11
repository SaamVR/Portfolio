"use client";

import { useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { filterAndSortProducts, type ShopSortOption } from "@/lib/shop-filters";
import { FashionV3Shell } from "@/components/storefront/fashion-v3/FashionV3Shell";
import { FashionV3ProductCard } from "@/components/storefront/fashion-v3/FashionV3ProductCard";

function toggleListValue(value: string, current: string[]) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function FashionV3ShopPage({ explicitStoreId }: { explicitStoreId?: string }) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id;
  const { data: products = [], isLoading } = useProducts(storeId);
  const { data: categories = [] } = useProductCategories(storeId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(24);

  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "All";
  const sort = (searchParams.get("sort") as ShopSortOption | null) ?? "newest";
  const saleOnly = searchParams.get("sale") === "1";
  const sizeParam = searchParams.get("size") ?? "";
  const colorParam = searchParams.get("color") ?? "";
  const sizes = useMemo(() => sizeParam.split(",").filter(Boolean), [sizeParam]);
  const colors = useMemo(() => colorParam.split(",").filter(Boolean), [colorParam]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value) next.delete(key); else next.set(key, value);
    setSearchParams(next);
    setDisplayCount(24);
  };

  const categoryNames = useMemo(() => categories.length > 0
    ? categories.map((item) => item.name)
    : Array.from(new Set(products.map((product) => product.category).filter(Boolean))), [categories, products]);
  const sizeOptions = useMemo(() => Array.from(new Set(products.flatMap((product) => product.sizes ?? []))).filter(Boolean), [products]);
  const colorOptions = useMemo(() => Array.from(new Set(products.flatMap((product) => product.colors ?? []))).filter(Boolean), [products]);
  const filtered = useMemo(() => filterAndSortProducts(products, {
    query,
    type: "All",
    category,
    sort: sort === "rating" ? "newest" : sort,
    saleOnly,
    selectedSizes: sizes,
    selectedColors: colors,
  }), [products, query, category, sort, saleOnly, sizes, colors]);
  const visible = filtered.slice(0, displayCount);
  const activeFilterCount = (category !== "All" ? 1 : 0) + sizes.length + colors.length + (saleOnly ? 1 : 0);

  return (
    <FashionV3Shell>
      <section className="mx-auto max-w-[1500px] px-5 pb-8 pt-10 md:px-8 md:pb-12 md:pt-16 lg:px-12">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">Collection</p>
        <div className="flex flex-col justify-between gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:pb-10">
          <div>
            <h1 className="max-w-[12ch] text-4xl font-semibold leading-[0.95] tracking-[-0.055em] md:text-6xl">{category === "All" ? "Shop the collection" : category}</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-black/55">Explore current drops, everyday staples, and seasonal edits from {store?.name || "the store"}.</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</p>
        </div>

        <div className="-mx-5 overflow-x-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
          <div className="flex min-w-max gap-6">
            <button onClick={() => setParam("category", null)} className={`border-b pb-1 text-xs font-semibold uppercase tracking-[0.12em] ${category === "All" ? "border-black text-black" : "border-transparent text-black/45"}`}>All</button>
            {categoryNames.map((name) => <button key={name} onClick={() => setParam("category", name)} className={`border-b pb-1 text-xs font-semibold uppercase tracking-[0.12em] ${category === name ? "border-black text-black" : "border-transparent text-black/45"}`}>{name}</button>)}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-y border-black/10 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-black/15 pb-2 md:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-black/45" />
            <input value={query} onChange={(event) => setParam("q", event.target.value || null)} placeholder="Search this collection" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35" />
            {query ? <button onClick={() => setParam("q", null)} aria-label="Clear search"><X className="h-4 w-4" /></button> : null}
          </div>
          <div className="flex items-center justify-between gap-2 md:justify-end">
            <button onClick={() => setFilterOpen(true)} className="inline-flex min-h-11 items-center gap-2 border border-black px-4 text-xs font-semibold uppercase tracking-[0.12em]"><Filter className="h-4 w-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}</button>
            <label className="relative inline-flex min-h-11 items-center border border-black/15 px-3"><SlidersHorizontal className="mr-2 h-4 w-4 text-black/50" /><select value={sort} onChange={(event) => setParam("sort", event.target.value === "newest" ? null : event.target.value)} className="appearance-none bg-transparent pr-5 text-xs font-semibold uppercase tracking-[0.1em] outline-none"><option value="newest">Newest</option><option value="price-asc">Price low-high</option><option value="price-desc">Price high-low</option><option value="name-asc">Name</option></select></label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 pb-20 md:px-8 md:pb-28 lg:px-12">
        {isLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse bg-black/5" />)}</div> : visible.length > 0 ? <><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">{visible.map((product) => <FashionV3ProductCard key={product.id} product={product} />)}</div>{visible.length < filtered.length ? <div className="mt-14 flex justify-center"><button onClick={() => setDisplayCount((count) => count + 24)} className="min-h-12 border border-black px-8 text-xs font-semibold uppercase tracking-[0.12em]">Load more</button></div> : null}</> : <div className="py-24 text-center"><h2 className="text-2xl font-semibold tracking-[-0.03em]">Nothing matches these filters</h2><p className="mt-2 text-sm text-black/50">Try clearing a filter or searching for something else.</p><button onClick={() => setSearchParams(new URLSearchParams())} className="mt-6 border-b border-black pb-1 text-xs font-semibold uppercase tracking-[0.12em]">Clear all</button></div>}
      </section>

      {filterOpen ? <div className="fixed inset-0 z-[100]"><button className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} aria-label="Close filters" /><aside className="absolute inset-y-0 right-0 w-[90%] max-w-md overflow-y-auto bg-[#fbfbf8] p-6 shadow-2xl"><div className="mb-8 flex items-center justify-between"><h2 className="text-xl font-semibold">Filters</h2><button onClick={() => setFilterOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close filters"><X className="h-5 w-5" /></button></div><div className="space-y-8"><div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Category</p><div className="space-y-2">{["All", ...categoryNames].map((value) => <button key={value} onClick={() => setParam("category", value === "All" ? null : value)} className="flex w-full items-center justify-between border-b border-black/10 py-2 text-sm"><span>{value}</span>{category === value ? <span>✓</span> : null}</button>)}</div></div>{sizeOptions.length > 0 ? <div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Size</p><div className="flex flex-wrap gap-2">{sizeOptions.map((size) => <button key={size} onClick={() => setParam("size", toggleListValue(size, sizes).join(",") || null)} className={`min-h-10 min-w-10 border px-3 text-xs ${sizes.includes(size) ? "border-black bg-black text-white" : "border-black/15"}`}>{size}</button>)}</div></div> : null}{colorOptions.length > 0 ? <div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Color</p><div className="flex flex-wrap gap-3">{colorOptions.map((color) => <button key={color} onClick={() => setParam("color", toggleListValue(color, colors).join(",") || null)} className={`flex items-center gap-2 border-b pb-1 text-sm ${colors.includes(color) ? "border-black" : "border-transparent"}`}><span className="h-4 w-4 rounded-full border border-black/15" style={{ backgroundColor: color.toLowerCase() === "white" ? "#f4f4f4" : color }} />{color}</button>)}</div></div> : null}<label className="flex items-center gap-3 border-t border-black/10 pt-5 text-sm"><input type="checkbox" checked={saleOnly} onChange={(event) => setParam("sale", event.target.checked ? "1" : null)} /> Sale only</label></div><div className="sticky bottom-0 mt-10 flex gap-3 bg-[#fbfbf8] py-4"><button onClick={() => { setSearchParams(new URLSearchParams()); setFilterOpen(false); }} className="min-h-12 flex-1 border border-black px-4 text-xs font-semibold uppercase tracking-[0.12em]">Clear</button><button onClick={() => setFilterOpen(false)} className="min-h-12 flex-1 bg-black px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">Show {filtered.length}</button></div></aside></div> : null}
    </FashionV3Shell>
  );
}
