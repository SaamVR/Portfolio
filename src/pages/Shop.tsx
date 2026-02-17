import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { products, productTypes, typeLabels } from "@/data/products";
import { X } from "lucide-react";

const tiers = ["All", "Essentials", "Street", "Premium"];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const activeType = searchParams.get("type") || "All";
  const activeTier = searchParams.get("category") || "All";

  const filtered = products.filter((p) => {
    const matchesType = activeType === "All" || p.type === activeType;
    const matchesTier = activeTier === "All" || p.category === activeTier;
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesTier && matchesQuery;
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

  const clearFilters = () => setSearchParams({});

  const hasFilters = query || activeType !== "All" || activeTier !== "All";

  const pageTitle = activeType === "All" ? "All Products" : typeLabels[activeType] || "Products";

  // Count products per type
  const typeCounts = productTypes.map((t) => ({
    ...t,
    count: t.value === "All" ? products.length : products.filter((p) => p.type === t.value).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-16" id="main-content">
          <section className="py-16">
            <div className="container mx-auto px-4">
              <AnimatedSection animation="blur">
                <div className="mb-8">
                  <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Collection</p>
                  <h1 className="font-heading text-4xl font-bold text-foreground">{pageTitle}</h1>
                </div>
              </AnimatedSection>

              {/* Product type tabs */}
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

              {/* Tier sub-filter */}
              <AnimatedSection delay={150} animation="blur">
                <div className="mb-8 flex flex-wrap items-center gap-2">
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
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="ml-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground smooth-hover"
                    >
                      <X className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>
              </AnimatedSection>

              {query && (
                <p className="mb-6 text-sm text-muted-foreground">
                  Results for "<span className="text-foreground font-medium">{query}</span>"
                </p>
              )}

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
                      <ProductCard product={product} />
                    </AnimatedSection>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Shop;
