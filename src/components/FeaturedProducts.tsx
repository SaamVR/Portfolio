import type { CSSProperties } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { ArrowRight } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass, getStorefrontProductGridClass } from "@/lib/storefront-theme-customization";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { storefrontPath } from "@/lib/slug";
import { StorefrontSectionEmpty, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";

const FeaturedProducts = ({
  limit = 6,
  title,
  tagline,
  layoutVariant,
  source = "featured-or-all",
  category,
  productType,
  imagePosition,
  focalX,
  focalY,
  disableLegacyFallback = false,
}: {
  limit?: number;
  title?: string;
  tagline?: string;
  layoutVariant?: "2-col" | "3-col" | "4-col" | "3-col-sidebar-left" | "3-col-sidebar-right" | string;
  source?: "featured-or-all" | "featured" | "all" | "newest" | "category" | "type" | string;
  category?: string;
  productType?: string;
  imagePosition?: string;
  focalX?: number;
  focalY?: number;
  disableLegacyFallback?: boolean;
}) => {
  const currentStore = useOptionalStore();
  const { data: featured = [], isLoading: featuredLoading } = useFeaturedProducts(currentStore?.id);
  const { data: allProducts = [], isLoading: productsLoading } = useProducts(currentStore?.id);
  const { data: settings } = useSiteSettings<{ tagline?: string; title?: string }>("home_featured", currentStore?.id);
  const { data: themeCustomization } = useStorefrontThemeCustomization(currentStore?.id);
  const legacySettings = disableLegacyFallback ? null : settings;
  const availableProducts = allProducts.filter((product) => product.isAvailable !== false);
  const productsToRender = (() => {
    switch (source) {
      case "featured":
        return featured;
      case "all":
        return availableProducts;
      case "newest":
        // useProducts() preserves the storefront source order; the canonical DB path is newest-first.
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
      ? "grid-cols-1 min-[360px]:grid-cols-2"
      : layoutVariant === "3-col" || layoutVariant === "grid" || layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right"
        ? "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3"
        : layoutVariant === "4-col"
          ? "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4"
          : getStorefrontProductGridClass(themeCustomization?.product_grid).replace("grid-cols-1", "grid-cols-1 min-[360px]:grid-cols-2");
  const hasSidebar = layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right";
  const objectPosition = resolveStorefrontImageObjectPosition({ position: imagePosition, focalX, focalY });
  const sectionStyle = {
    ["--storefront-product-image-position" as string]: objectPosition,
  } as CSSProperties;
  const sectionTagline = tagline ?? legacySettings?.tagline ?? "Featured";
  const sectionTitle = title ?? legacySettings?.title ?? "Explore what’s available";
  const browseAllHref = storefrontPath("/shop", currentStore?.slug);

  const sectionIntro = (
    <div className="max-w-3xl text-left md:mx-auto md:text-center">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground md:text-sm">{sectionTagline}</p>
      <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">{sectionTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
        Browse this selection, then open any item for its full details and available options.
      </p>
    </div>
  );

  const sidebar = (
    <aside className="rounded-[var(--sf-card-radius)] border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{sectionTagline}</p>
      <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">{sectionTitle}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Compare the visible options and open a product when you need the complete description, variants, or purchase details.
      </p>
      <Button asChild variant="outline" className="mt-5 min-h-11 w-full justify-between rounded-xl">
        <Link href={browseAllHref}>
          View full catalog
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </aside>
  );

  if (featuredLoading || productsLoading) {
    return <StorefrontSectionSkeleton title={sectionTitle || "Loading products"} cards={4} />;
  }

  if (productsToRender.length === 0) {
    return (
      <StorefrontSectionEmpty
        eyebrow="Catalog"
        title={sectionTitle || "Products will appear here soon"}
        description="There are no published items in this selection yet. Browse the full catalog or contact the store for help."
        primaryLabel="Browse store"
        primaryHref={browseAllHref}
        secondaryLabel="Contact the store"
        secondaryHref={storefrontPath("/contact", currentStore?.slug)}
      />
    );
  }

  const visibleProducts = productsToRender.slice(0, limit);

  return (
    <section className="py-14 md:py-20" style={sectionStyle}>
      <div className={`mx-auto px-4 ${containerClass}`}>
        {!hasSidebar ? (
          <AnimatedSection animation="blur">
            <div className="mb-8 md:mb-12">{sectionIntro}</div>
          </AnimatedSection>
        ) : null}

        <div
          className={
            hasSidebar
              ? `grid gap-6 lg:items-start ${layoutVariant === "3-col-sidebar-right" ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`
              : ""
          }
        >
          {hasSidebar && layoutVariant !== "3-col-sidebar-right" ? sidebar : null}
          <div className={`grid gap-4 md:gap-6 ${variantGridClass}`}>
            {visibleProducts.map((product, index) => (
              <AnimatedSection key={product.id} delay={Math.min(index, 4) * 80} animation="blur">
                <ProductCard product={product} />
              </AnimatedSection>
            ))}
          </div>
          {hasSidebar && layoutVariant === "3-col-sidebar-right" ? sidebar : null}
        </div>

        {!hasSidebar && productsToRender.length > visibleProducts.length ? (
          <div className="mt-8 flex justify-center md:mt-10">
            <Button asChild variant="outline" size="lg" className="min-h-11 rounded-full px-6">
              <Link href={browseAllHref}>
                View all products
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default FeaturedProducts;
