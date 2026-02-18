import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";

const FeaturedProducts = () => {
  const { data: featured = [], isLoading } = useFeaturedProducts();

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">Curated</p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Featured Drops</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product, i) => (
            <AnimatedSection key={product.id} delay={i * 100} animation="blur">
              <ProductCard product={product} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
