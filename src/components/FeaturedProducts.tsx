import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass, getStorefrontProductGridClass } from "@/lib/storefront-theme-customization";

const FeaturedProducts = ({
  limit = 6,
  title,
  tagline,
  disableLegacyFallback = false,
}: {
  limit?: number;
  title?: string;
  tagline?: string;
  disableLegacyFallback?: boolean;
}) => {
  const currentStore = useOptionalStore();
  const { data: featured = [], isLoading } = useFeaturedProducts(currentStore?.id);
  const { data: allProducts = [] } = useProducts(currentStore?.id);
  const { data: settings } = useSiteSettings<{tagline?: string, title?: string}>("home_featured", currentStore?.id);
  const { data: themeCustomization } = useStorefrontThemeCustomization(currentStore?.id);
  const legacySettings = disableLegacyFallback ? null : settings;
  const productsToRender = featured.length > 0 ? featured : allProducts.filter((product) => product.isAvailable !== false);
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const productGridClass = getStorefrontProductGridClass(themeCustomization?.product_grid);

  if (isLoading) {
    return (
      <section className="py-20">
        <div className={`mx-auto flex justify-center px-4 ${containerClass}`}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (productsToRender.length === 0) return null;

  return (
    <section className="py-20">
      <div className={`mx-auto px-4 ${containerClass}`}>
        <AnimatedSection animation="blur">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">{tagline ?? legacySettings?.tagline ?? "Featured"}</p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{title ?? legacySettings?.title ?? "Explore What’s Available"}</h2>
          </div>
        </AnimatedSection>
        <div className={`grid gap-6 ${productGridClass}`}>
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
