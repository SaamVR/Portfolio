import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";

const FeaturedProducts = ({
  limit = 6,
  title,
  tagline,
}: {
  limit?: number;
  title?: string;
  tagline?: string;
}) => {
  const currentStore = useOptionalStore();
  const { data: featured = [], isLoading } = useFeaturedProducts(currentStore?.id);
  const { data: allProducts = [] } = useProducts(currentStore?.id);
  const { data: settings } = useSiteSettings<{tagline?: string, title?: string}>("home_featured");
  const productsToRender = featured.length > 0 ? featured : allProducts.filter((product) => product.isAvailable !== false);

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (productsToRender.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <AnimatedSection animation="blur">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">{tagline ?? settings?.tagline ?? "Highlights"}</p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{title ?? settings?.title ?? "Explore the Collection"}</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {productsToRender.slice(0, limit).map((product, i) => (
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
