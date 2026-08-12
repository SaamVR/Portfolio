import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass, getStorefrontProductGridClass } from "@/lib/storefront-theme-customization";
import { storefrontPath } from "@/lib/slug";

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
  const { data: settings } = useSiteSettings<{ tagline?: string; title?: string }>("home_featured", currentStore?.id);
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
      <section className="py-14 md:py-20">
        <div className={`mx-auto flex justify-center px-4 ${containerClass}`}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (productsToRender.length === 0) {
    return (
      <section className="py-14 md:py-20">
        <div className={`mx-auto px-4 ${containerClass}`}>
          <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card px-6 py-8 shadow-sm md:px-8 md:py-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Catalog coming together</p>
                <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {title ?? legacySettings?.title ?? "Products will appear here soon"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
                  The storefront structure is already live. Add the first real items to turn this space into a browsable catalog, menu, booking list, or offer gallery.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                <Button asChild className="gap-2">
                  <Link href={storefrontPath("/shop", currentStore?.slug)}>
                    Browse store
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href={storefrontPath("/contact", currentStore?.slug)}>
                    <Sparkles className="h-4 w-4" />
                    Contact the store
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 md:py-20">
      <div className={`mx-auto px-4 ${containerClass}`}>
        <AnimatedSection animation="blur">
          <div className="mb-8 text-left md:mb-12 md:text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary md:text-sm">
              {tagline ?? legacySettings?.tagline ?? "Featured"}
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {title ?? legacySettings?.title ?? "Explore What’s Available"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:mx-auto md:text-base">
              Start with the strongest items first so shoppers immediately understand what this storefront is actually selling.
            </p>
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
          <div className={`grid gap-4 md:gap-6 ${variantGridClass}`}>
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
