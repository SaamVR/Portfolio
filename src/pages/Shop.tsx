import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import ProductQuickView from "@/components/ProductQuickView";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import SizeGuide from "@/components/SizeGuide";
import { productTypes, typeLabels, type Product } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import { X, ArrowUpDown, Ruler, Loader2, SlidersHorizontal, ChevronDown, ChevronUp, Tag } from "lucide-react";

const tiers = ["All", "Essentials", "Street", "Premium"];

type SortOption = "newest" | "price-asc" | "price-desc";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest",
  "price-asc": "Price: Low → High",
  "price-desc": "Price: High → Low",
};

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const activeType = searchParams.get("type") || "All";
  const activeTier = searchParams.get("category") || "All";
  const activeSort = (searchParams.get("sort") as SortOption) || "newest";
  const saleOnly = searchParams.get("sale") === "1";

  const { data: products = [], isLoading } = useProducts();

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const availableProducts = products.filter((p) => p.isAvailable !== false);

  const saleCount = availableProducts.filter((p) => !!p.originalPrice).length;

  const filtered = availableProducts
    .filter((p) => {
      const matchesType = activeType === "All" || p.type === activeType;
      const matchesTier = activeTier === "All" || p.category === activeTier;
      const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
      const matchesMin = !minPrice || p.price >= Number(minPrice);
      const matchesMax = !maxPrice || p.price <= Number(maxPrice);
      const matchesSale = !saleOnly || !!p.originalPrice;
      return matchesType && matchesTier && matchesQuery && matchesMin && matchesMax && matchesSale;
    })
    .sort((a, b) => {
      if (activeSort === "price-asc") return a.price - b.price;
      if (activeSort === "price-desc") return b.price - a.price;
      return 0;
    });

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

  const setSort = (sort: SortOption) => {
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
  };

  const hasPriceFilter = !!minPrice || !!maxPrice;
  const hasFilters = query || activeType !== "All" || activeTier !== "All" || activeSort !== "newest" || hasPriceFilter || saleOnly;

  const pageTitle = activeType === "All" ? "All Products" : typeLabels[activeType] || "Products";

  const typeCounts = productTypes.map((t) => ({
    ...t,
    count: t.value === "All" ? availableProducts.length : availableProducts.filter((p) => p.type === t.value).length,
  }));

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };


  return (
    <Layout>
      <SEOHead
        title={pageTitle}
        description="Browse the full ThreadBD collection. Premium streetwear tees, polos, and more."
        canonical="https://threadbd.lovable.app/shop"
      />
      <PageTransition>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <AnimatedSection animation="blur">
              <div className="mb-8">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Collection</p>
                <h1 className="font-heading text-4xl font-bold text-foreground">{pageTitle}</h1>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100} animation="blur">
              <div className="mb-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
                {typeCounts.map((t) => (
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
            </AnimatedSection>

            <AnimatedSection delay={150} animation="blur">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {tiers.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setTier(tier)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-300 ${
                        (tier === "All" && !searchParams.get("category")) || activeTier === tier
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tier}
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
                          {(Object.keys(sortLabels) as SortOption[]).map((option) => (
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
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Min"
                        className="h-8 w-24 rounded-md border border-border bg-background pl-6 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        min={0}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">—</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Max"
                        className="h-8 w-24 rounded-md border border-border bg-background pl-6 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  Showing <span className="text-foreground font-medium">{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}
                </p>

                {filtered.length === 0 ? (
                  <AnimatedSection animation="blur">
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="mb-4 font-heading text-xl font-semibold text-foreground">No products found</p>
                      <p className="mb-6 text-muted-foreground">Try adjusting your search or filters.</p>
                      <button
                        onClick={clearFilters}
                        className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 smooth-hover"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </AnimatedSection>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((product, i) => (
                      <AnimatedSection key={product.id} delay={i * 80} animation="blur">
                        <ProductCard product={product} onQuickView={handleQuickView} />
                      </AnimatedSection>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </PageTransition>

      <ProductQuickView product={quickViewProduct} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      <SizeGuide open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />
    </Layout>
  );
};

export default Shop;
