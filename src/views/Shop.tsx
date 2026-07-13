import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useOptionalStore } from "@/components/storefront/store-context";
import SEOHead from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import ProductQuickView from "@/components/ProductQuickView";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import SizeGuide from "@/components/SizeGuide";
import type { Product } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { buildShopOptions, filterAndSortProducts, type ShopSortOption } from "@/lib/shop-filters";
import { X, ArrowUpDown, Ruler, Loader2, SlidersHorizontal, ChevronDown, ChevronUp, Tag, Search } from "lucide-react";

const sortLabels: Record<ShopSortOption, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

const ALL_PRODUCTS_LABEL = "All Products";

type CatalogRow = {
  name?: string | null;
};

interface ShopProps {
  explicitStoreId?: string;
}

const Shop = ({ explicitStoreId }: ShopProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const activeType = searchParams.get("type") || "All";
  const activeTier = searchParams.get("category") || "All";
  const activeSort = (searchParams.get("sort") as ShopSortOption) || "newest";
  const saleOnly = searchParams.get("sale") === "1";

  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const storeName = currentStore?.name ?? "the store";

  const { data: products = [], isLoading } = useProducts(storeId);
  const { data: productTypeRows = [] } = useProductTypes(storeId);
  const { data: productCategoryRows = [] } = useProductCategories(storeId);

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const availableProducts = useMemo(() => products.filter((p) => p.isAvailable !== false), [products]);

  const saleCount = useMemo(() => availableProducts.filter((p) => !!p.originalPrice).length, [availableProducts]);

  const typeOptions = useMemo(() => {
    const configuredNames = (productTypeRows as CatalogRow[]).map((row) => row.name).filter((name): name is string => Boolean(name));
    return buildShopOptions(availableProducts, "type", configuredNames);
  }, [availableProducts, productTypeRows]);

  const categoryOptions = useMemo(() => {
    const configuredNames = (productCategoryRows as CatalogRow[]).map((row) => row.name).filter((name): name is string => Boolean(name));
    return buildShopOptions(availableProducts, "category", configuredNames);
  }, [availableProducts, productCategoryRows]);

  const filtered = useMemo(
    () =>
      filterAndSortProducts(availableProducts, {
        query,
        type: activeType,
        category: activeTier,
        sort: activeSort,
        saleOnly,
        minPrice,
        maxPrice,
        selectedSizes,
        selectedColors,
      }),
    [activeSort, activeTier, activeType, availableProducts, maxPrice, minPrice, query, saleOnly, selectedColors, selectedSizes],
  );

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(12);
  }, [activeType, activeTier, query, activeSort, minPrice, maxPrice, saleOnly, selectedSizes, selectedColors]);

  // Infinite Scroll Logic
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < filtered.length) {
          setDisplayCount((prev) => prev + 12);
        }
      },
      { threshold: 0.1, rootMargin: "400px" } // Trigger 400px before reaching the bottom
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [displayCount, filtered.length]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach(p => p.colors?.forEach(c => colors.add(c)));
    return Array.from(colors).sort();
  }, [products]);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(p => p.sizes?.forEach(s => sizes.add(s)));
    return Array.from(sizes);
  }, [products]);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };



  const setQuery = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) params.set("q", value);
    else params.delete("q");
    setSearchParams(params);
  };

  const setType = (type: string) => {
    const params = new URLSearchParams(searchParams);
    if (type === "All") params.delete("type");
    else params.set("type", type);
    setSearchParams(params);
  };

  const setTier = (tier: string) => {
    const params = new URLSearchParams(searchParams);
    if (tier === "All") params.delete("category");
    else params.set("category", tier);
    setSearchParams(params);
  };

  const setSort = (sort: ShopSortOption) => {
    const params = new URLSearchParams(searchParams);
    if (sort === "newest") params.delete("sort");
    else params.set("sort", sort);
    setSearchParams(params);
    setSortDropdownOpen(false);
  };

  const toggleSale = () => {
    const params = new URLSearchParams(searchParams);
    if (saleOnly) params.delete("sale");
    else params.set("sale", "1");
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setMinPrice("");
    setMaxPrice("");
    setSelectedSizes([]);
    setSelectedColors([]);
  };

  const hasPriceFilter = !!minPrice || !!maxPrice;
  const hasFilters = query || activeType !== "All" || activeTier !== "All" || activeSort !== "newest" || hasPriceFilter || saleOnly || selectedSizes.length > 0 || selectedColors.length > 0;

  const activeTypeLabel = typeOptions.find((option) => option.value === activeType)?.label;
  const pageTitle = activeType === "All" ? ALL_PRODUCTS_LABEL : activeTypeLabel || "Products";

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };


  const LayoutWrapper = explicitStoreId ? StorefrontLayout : Layout;

  return (
    <LayoutWrapper>
      {!explicitStoreId ? (
        <SEOHead
          title={pageTitle}
          description={`Browse the full ${storeName} collection.`}
          canonical={absoluteStoreUrl(currentStore, "/shop")}
        />
      ) : null}
      <PageTransition>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <AnimatedSection animation="blur">
              <div className="mb-8">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Collection</p>
                <h1 className="font-heading text-4xl font-bold text-foreground">{pageTitle}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Browse {storeName} products with live search, categories, sizes, colors, price, and sale filters.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100} animation="blur">
              <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {typeOptions.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                      (t.value === "All" && !searchParams.get("type")) || activeType === t.value
                        ? "bg-primary text-primary-foreground glow-shadow"
                        : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
                  </button>
                ))}
                </div>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products..."
                    className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={150} animation="blur">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryOptions.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() => setTier(tier.value)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-300 ${
                        (tier.value === "All" && !searchParams.get("category")) || activeTier === tier.value
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tier.label}
                      <span className="ml-1.5 opacity-60">{tier.count}</span>
                    </button>
                  ))}
                  <button
                    onClick={toggleSale}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all duration-300 ${
                      saleOnly
                        ? "border border-amber-500/30 bg-amber-500/15 text-amber-500"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    Sale
                    <span className="opacity-60">{saleCount}</span>
                  </button>
                  <button
                    onClick={() => setShowPriceFilter((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all duration-300 ${
                      hasPriceFilter
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Price
                    {showPriceFilter ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="ml-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground smooth-hover"
                    >
                      <X className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground smooth-hover hover:border-primary/50 hover:text-foreground"
                    aria-label="Open size guide"
                  >
                    <Ruler className="h-3.5 w-3.5" /> Size Guide
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground smooth-hover hover:border-primary/50 hover:text-foreground"
                      aria-label="Sort products"
                      aria-expanded={sortDropdownOpen}
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {sortLabels[activeSort]}
                    </button>

                    {sortDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSortDropdownOpen(false)} />
                        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-card p-1 premium-shadow">
                          {(Object.keys(sortLabels) as ShopSortOption[]).map((option) => (
                            <button
                              key={option}
                              onClick={() => setSort(option)}
                              className={`block w-full rounded-md px-3 py-2 text-left text-xs font-medium smooth-hover ${
                                activeSort === option
                                  ? "bg-secondary text-foreground"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              {sortLabels[option]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Price range filter */}
              {showPriceFilter && (
                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <span className="text-xs font-medium text-foreground">Price range:</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">BDT</span>
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Min"
                        className="h-8 w-24 rounded-md border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        min={0}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">-</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">BDT</span>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Max"
                        className="h-8 w-24 rounded-md border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        min={0}
                      />
                    </div>
                    {hasPriceFilter && (
                      <button
                        onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </AnimatedSection>

            {query && (
              <p className="mb-6 text-sm text-muted-foreground">
                Results for "<span className="text-foreground font-medium">{query}</span>"
              </p>
            )}

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Faceted Filters Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-8 lg:sticky lg:top-24 h-max">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-4">Categories</h3>
                    <div className="space-y-2">
                      {categoryOptions.map((tier) => (
                        <label key={tier.value} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={activeTier === tier.value || (tier.value === "All" && activeTier === "All")}
                            onChange={() => setTier(tier.value)}
                            className="rounded border-border text-primary focus:ring-primary" 
                          />
                          <span className="flex-1 text-sm text-muted-foreground">{tier.label}</span>
                          <span className="text-xs text-muted-foreground">{tier.count}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-4">Price Range</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Min"
                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                        min={0}
                      />
                      <span className="text-xs text-muted-foreground">-</span>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Max"
                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                        min={0}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-4">Availability</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={saleOnly}
                        onChange={toggleSale}
                        className="rounded border-border text-primary focus:ring-primary" 
                      />
                      <span className="text-sm text-muted-foreground">On Sale Only</span>
                    </label>
                  </div>

                  {availableSizes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-4">Sizes</h3>
                      <div className="flex flex-wrap gap-2">
                        {availableSizes.map((size) => (
                          <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            className={`flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-medium transition-colors ${
                              selectedSizes.includes(size)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableColors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-4">Colors</h3>
                      <div className="flex flex-wrap gap-2">
                        {availableColors.map((color) => {
                          // Very basic mapping for demo, usually use a full map like in ProductDetail
                          const bg = color.toLowerCase() === 'white' ? '#fff' : color.toLowerCase() === 'black' ? '#000' : color.toLowerCase() === 'grey' ? '#808080' : color.toLowerCase() === 'navy' ? '#000080' : color.toLowerCase();
                          return (
                            <button
                              key={color}
                              onClick={() => toggleColor(color)}
                              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                                selectedColors.includes(color)
                                  ? "border-primary scale-110 ring-2 ring-primary ring-offset-1 ring-offset-background"
                                  : "border-border hover:scale-110"
                              }`}
                              style={{ backgroundColor: bg }}
                              title={color}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Product Grid */}
                <div className="flex-1">
                  <div className="mb-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="text-foreground font-medium">{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}
                    </p>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <AnimatedSection animation="blur">
                      <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-dashed border-border bg-card">
                        <p className="mb-4 font-heading text-xl font-semibold text-foreground">No products found</p>
                        <p className="mb-6 text-muted-foreground">Try adjusting your filters or search query.</p>
                        <button
                          onClick={clearFilters}
                          className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 smooth-hover"
                        >
                          Reset Everything
                        </button>
                      </div>
                    </AnimatedSection>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.slice(0, displayCount).map((product, i) => (
                          <AnimatedSection key={product.id} delay={(i % 12) * 80} animation="blur">
                            <ProductCard product={product} onQuickView={handleQuickView} />
                          </AnimatedSection>
                        ))}
                      </div>
                      
                      {/* Infinite Scroll Trigger */}
                      {displayCount < filtered.length && (
                        <div ref={loadMoreRef} className="mt-12 flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      
                      {displayCount >= filtered.length && filtered.length > 0 && (
                        <div className="mt-12 text-center text-sm text-muted-foreground py-8">
                          You've reached the end of the collection.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </PageTransition>

      <ProductQuickView product={quickViewProduct} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      <SizeGuide open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />
    </LayoutWrapper>
  );
};

export default Shop;


