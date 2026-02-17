import { useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import { products } from "@/data/products";
import { X } from "lucide-react";

const categories = ["All", "Essentials", "Street", "Premium"];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const activeCategory = searchParams.get("category") || "All";

  const filtered = products.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    if (cat === "All") params.delete("category");
    else params.set("category", cat);
    setSearchParams(params);
  };

  const clearFilters = () => setSearchParams({});

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-16" id="main-content">
          <section className="py-16">
            <div className="container mx-auto px-4">
              <AnimatedSection>
                <div className="mb-8">
                  <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Collection</p>
                  <h1 className="font-heading text-4xl font-bold text-foreground">All Tees</h1>
                </div>
              </AnimatedSection>

              {/* Category pills */}
              <AnimatedSection delay={100}>
                <div className="mb-8 flex flex-wrap items-center gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                        (cat === "All" && !searchParams.get("category")) || activeCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {(query || activeCategory !== "All") && (
                    <button
                      onClick={clearFilters}
                      className="ml-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Clear filters
                    </button>
                  )}
                </div>
              </AnimatedSection>

              {query && (
                <p className="mb-6 text-sm text-muted-foreground">
                  Results for "<span className="text-foreground font-medium">{query}</span>"
                </p>
              )}

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="mb-4 font-heading text-xl font-semibold text-foreground">No products found</p>
                  <p className="mb-6 text-muted-foreground">Try adjusting your search or filters.</p>
                  <button
                    onClick={clearFilters}
                    className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((product, i) => (
                    <AnimatedSection key={product.id} delay={i * 100}>
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
