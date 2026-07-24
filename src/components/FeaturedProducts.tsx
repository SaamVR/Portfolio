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
  layoutVariant,
  source = "featured-or-all",
  category,
  productType,
  disableLegacyFallback = false,
}: {
  limit?: number;
  title?: string;
  tagline?: string;
  layoutVariant?: "2-col" | "3-col" | "4-col" | "3-col-sidebar-left" | "3-col-sidebar-right" | string;
  source?: "featured-or-all" | "featured" | "all" | "newest" | "category" | "type" | string;
  category?: string;
  productType?: string;
  disableLegacyFallback?: boolean;
}) => {
  const currentStore = useOptionalStore();
  const { data: featured = [], isLoading } = useFeaturedProducts(currentStore?.id);
  const { data: allProducts = [] } = useProducts(currentStore?.id);
  const { data: settings } = useSiteSettings<{tagline?: string, title?: string}>("home_featured", currentStore?.id);
  const { data: themeCustomization } = useStorefrontThemeCustomization(currentStore?.id);
  const legacySettings = disableLegacyFallback ? null : settings;
  const availableProducts = allProducts.filter((product) => product.isAvailable !== false);
  const productsToRender = (() => {
    switch (source) {
      case "featured":
        return featured;
      case "all":
      case "newest":
        return availableProducts;
      case "category":
        return category ? availableProducts.filter((product) => product.category === category) : availableProducts;
      case "type":
        return productType ? availableProducts.filter((product) => product.type === productType) : availableProducts;
      case "featured-or-all":
      default:
        return featured.length > 0 ? featured : availableProducts;
    }
  })();
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const variantGridClass =
    layoutVariant === "2-col"
      ? "grid-cols-1 sm:grid-cols-2"
      : layoutVariant === "3-col" || layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : layoutVariant === "4-col"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : getStorefrontProductGridClass(themeCustomization?.product_grid);
  const hasSidebar = layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right";
  const sidebar = (
    <aside className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Shop guide</p>
      <div className="mt-4 space-y-3">
        {["Featured picks", "New arrivals", "Best value", "Ready to ship"].map((item) => (
          <div key={item} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2">
            <span className="text-sm font-medium text-foreground">{item}</span>
            <span className="h-2 w-2 rounded-full bg-primary" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Use this layout when shoppers need a little more browsing guidance before choosing a product.
      </p>
    </aside>
  );

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
        <div
          className={
            hasSidebar
              ? `grid gap-6 ${layoutVariant === "3-col-sidebar-right" ? "lg:grid-cols-[minmax(0,1fr)_260px]" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`
              : ""
          }
        >
          {hasSidebar && layoutVariant !== "3-col-sidebar-right" ? sidebar : null}
          <div className={`grid gap-6 ${variantGridClass}`}>
            {productsToRender.slice(0, limit).map((product, i) => (
              <AnimatedSection key={product.id} delay={i * 100} animation="blur">
                <ProductCard product={product} />
              </AnimatedSection>
            ))}
          </div>
          {hasSidebar && layoutVariant === "3-col-sidebar-right" ? sidebar : null}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
