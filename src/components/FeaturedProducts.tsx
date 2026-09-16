import type { CSSProperties } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import AnimatedSection from "@/components/AnimatedSection";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { ArrowRight } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass, getStorefrontProductGridClass } from "@/lib/storefront-theme-customization";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { storefrontPath } from "@/lib/slug";
import { StorefrontSectionEmpty, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";
import { FeaturedProductsVisualStyles } from "@/components/storefront/section-styles/FeaturedProductsVisualStyles";
import { resolveFeaturedProductSectionStyle } from "@/components/storefront/section-styles/lane-c-style-keys";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { cn } from "@/lib/utils";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { resolveSectionOptionClasses } from "@/components/storefront/section-styles/section-option-primitives";

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
  variantOptions,
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
  variantOptions?: StorefrontVariantOptions;
  disableLegacyFallback?: boolean;
}) => {
  const currentStore = useOptionalStore();
  const { data: featured = [], isLoading: featuredLoading } = useFeaturedProducts(currentStore?.id);
  const { data: allProducts = [], isLoading: productsLoading } = useProducts(currentStore?.id);
  const { data: settings } = useSiteSettings<{ tagline?: string; title?: string }>("home_featured", currentStore?.id);
  const { data: themeCustomization } = useStorefrontThemeCustomization(currentStore?.id);
  const legacySettings = disableLegacyFallback ? null : settings;
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isFashion = templateId === "fashion";
  const availableProducts = allProducts.filter((product) => product.isAvailable !== false);
  const productsToRender = (() => {
    switch (source) {
      case "featured":
        return featured;
      case "all":
        return availableProducts;
      case "newest":
        return [...availableProducts].reverse();
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
  const optionClasses = resolveSectionOptionClasses(variantOptions);
  const variantGridClass = optionClasses.mobile.isStack
    ? layoutVariant === "4-col"
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      : layoutVariant === "3-col" || layoutVariant === "grid"
        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2"
    :
    layoutVariant === "2-col"
      ? "grid-cols-2"
      : layoutVariant === "3-col" || layoutVariant === "grid" || layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right"
        ? "grid-cols-2 lg:grid-cols-3"
        : layoutVariant === "4-col"
          ? "grid-cols-2 lg:grid-cols-4"
          : getStorefrontProductGridClass(themeCustomization?.product_grid).replace("grid-cols-1", "grid-cols-2");
  const hasSidebar = layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right";
  const objectPosition = resolveStorefrontImageObjectPosition({ position: imagePosition, focalX, focalY });
  const sectionStyle = {
    ["--storefront-product-image-position" as string]: objectPosition,
  } as CSSProperties;
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

  if (featuredLoading || productsLoading) {
    return <StorefrontSectionSkeleton title={title ?? "Loading products"} cards={4} />;
  }

  if (productsToRender.length === 0) {
    return (
      <StorefrontSectionEmpty
        eyebrow="Catalog coming together"
        title={title ?? legacySettings?.title ?? "Products will appear here soon"}
        description="Add the first real items to turn this space into a browsable catalog, menu, booking list, or offer gallery."
        primaryLabel="Browse store"
        primaryHref={storefrontPath("/shop", currentStore?.slug)}
        secondaryLabel="Contact the store"
        secondaryHref={storefrontPath("/contact", currentStore?.slug)}
      />
    );
  }

  const visualStyle = resolveFeaturedProductSectionStyle(layoutVariant);
  if (visualStyle) {
    return (
      <FeaturedProductsVisualStyles
        variant={visualStyle}
        products={productsToRender.slice(0, limit)}
        title={title ?? legacySettings?.title ?? "Explore What’s Available"}
        tagline={tagline ?? legacySettings?.tagline ?? "Featured"}
        viewAllHref={storefrontPath("/shop", currentStore?.slug)}
        containerClass={containerClass}
        sectionStyle={sectionStyle}
        variantOptions={variantOptions}
      />
    );
  }

  return (
    <section className={cn(isFashion ? "py-16 md:py-28" : "py-14 md:py-20", optionClasses.spacingClassName)} style={sectionStyle}>
      <div className={cn("mx-auto px-4", containerClass, optionClasses.contentWidthClassName)}>
        <AnimatedSection animation="blur">
          {isFashion ? (
            <div className="mb-8 flex items-end justify-between gap-6 border-b border-border/70 pb-5 md:mb-12 md:pb-7">
              <div className="max-w-3xl text-left">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary md:text-sm">
                  {tagline ?? legacySettings?.tagline ?? "Featured"}
                </p>
                <h2 className={cn("font-heading text-4xl font-bold leading-[0.98] tracking-tight text-foreground sm:text-5xl md:text-6xl", optionClasses.emphasis.titleClassName)}>
                  {title ?? legacySettings?.title ?? "Explore What’s Available"}
                </h2>
              </div>
              <Link href={storefrontPath("/shop", currentStore?.slug)} className="hidden shrink-0 items-center gap-2 pb-1 text-sm font-semibold text-foreground transition-colors hover:text-primary sm:inline-flex">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mb-8 text-left md:mb-12 md:text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary md:text-sm">
                {tagline ?? legacySettings?.tagline ?? "Featured"}
              </p>
              <h2 className={cn("font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl", optionClasses.emphasis.titleClassName)}>
                {title ?? legacySettings?.title ?? "Explore What’s Available"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:mx-auto md:text-base">
                Start with the strongest items first so shoppers immediately understand what this storefront is actually selling.
              </p>
            </div>
          )}
        </AnimatedSection>
        <div
          className={
            hasSidebar
              ? `grid gap-6 ${layoutVariant === "3-col-sidebar-right" ? "lg:grid-cols-[minmax(0,1fr)_260px]" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`
              : ""
          }
        >
          {hasSidebar && layoutVariant !== "3-col-sidebar-right" ? sidebar : null}
          <div className={`grid ${isFashion ? "gap-2 sm:gap-3 md:gap-5" : "gap-3 sm:gap-4 md:gap-6"} ${variantGridClass}`}>
            {productsToRender.slice(0, limit).map((product, i) => (
              <AnimatedSection key={product.id} delay={Math.min(i, 4) * 80} animation="blur">
                <ProductCard product={product} />
              </AnimatedSection>
            ))}
          </div>
          {hasSidebar && layoutVariant === "3-col-sidebar-right" ? sidebar : null}
        </div>
        {isFashion ? (
          <div className="mt-7 sm:hidden">
            <Link href={storefrontPath("/shop", currentStore?.slug)} className="inline-flex min-h-11 items-center gap-2 border-b border-foreground pb-1 text-sm font-semibold text-foreground">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default FeaturedProducts;
