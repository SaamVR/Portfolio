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
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { getStorefrontExperienceProfile } from "@/lib/storefront-template-experience";
import { storefrontPath } from "@/lib/slug";
import { StorefrontSectionEmpty, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";
import { cn } from "@/lib/utils";

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
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const experience = getStorefrontExperienceProfile(templateId);
  const featuredExperience = experience.featured;
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
  const fallbackGridClass =
    layoutVariant === "2-col"
      ? "grid-cols-1 min-[360px]:grid-cols-2"
      : layoutVariant === "3-col" || layoutVariant === "grid" || layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right"
        ? "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3"
        : layoutVariant === "4-col"
          ? "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4"
          : getStorefrontProductGridClass(themeCustomization?.product_grid).replace("grid-cols-1", "grid-cols-1 min-[360px]:grid-cols-2");
  const objectPosition = resolveStorefrontImageObjectPosition({ position: imagePosition, focalX, focalY });
  const sectionStyle = {
    ["--storefront-product-image-position" as string]: objectPosition,
  } as CSSProperties;
  const sectionTagline = tagline ?? legacySettings?.tagline ?? "Featured";
  const sectionTitle = title ?? legacySettings?.title ?? "Explore what’s available";
  const browseAllHref = storefrontPath("/shop", currentStore?.slug);

  const isEditorial = featuredExperience === "editorial";
  const isBeauty = featuredExperience === "beauty";
  const isTech = featuredExperience === "tech" || featuredExperience === "digital";
  const isMenu = featuredExperience === "menu";
  const isArtisan = featuredExperience === "artisan";
  const isPlans = featuredExperience === "plans";
  const isSpotlight = featuredExperience === "spotlight";
  const isAssisted = featuredExperience === "inquiry" || featuredExperience === "property";
  const isService = featuredExperience === "service" || featuredExperience === "booking" || featuredExperience === "hotel";

  const experienceGridClass = (() => {
    switch (featuredExperience) {
      case "editorial":
        return "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4";
      case "beauty":
        return "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3";
      case "tech":
      case "digital":
        return "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4";
      case "menu":
        return "grid-cols-1 sm:grid-cols-2";
      case "artisan":
        return "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3";
      case "plans":
        return "grid-cols-1 md:grid-cols-3";
      case "spotlight":
        return "grid-cols-1 md:grid-cols-2";
      case "inquiry":
      case "service":
      case "booking":
      case "hotel":
      case "property":
        return "grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3";
      case "catalog":
      default:
        return fallbackGridClass;
    }
  })();

  const useSidebar = isAssisted || layoutVariant === "3-col-sidebar-left" || layoutVariant === "3-col-sidebar-right";
  const sidebarOnRight = layoutVariant === "3-col-sidebar-right";

  const helperText = isEditorial
    ? "Scan the edit, open a piece for sizing and variants, then continue through the collection."
    : isBeauty
      ? "Compare the visible routines and products, then open an item for ingredients, variants, and purchase details."
      : isTech
        ? "Compare the visible options first, then open a product for complete specs, compatibility, and purchase details."
        : isMenu
          ? "Choose an item, review the details, and continue to the ordering flow when you are ready."
          : isPlans
            ? "Compare the available offers and open the option that best matches your needs before committing."
            : isAssisted
              ? "Narrow the visible options, then open a listing when you are ready for the complete details or an inquiry."
              : isService
                ? "Compare the available options, then open one for timing, inclusions, availability, or booking details."
                : "Browse this selection, then open any item for its full details and available options.";

  const sectionIntro = (
    <div className={cn(
      "max-w-3xl",
      isEditorial || isTech || isMenu || isArtisan || isAssisted ? "text-left" : "text-left md:mx-auto md:text-center",
    )}>
      <p className={cn(
        "mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground md:text-sm",
        isEditorial && "tracking-[0.28em]",
        isTech && "font-mono tracking-[0.16em] text-primary",
      )}>{sectionTagline}</p>
      <h2 className={cn(
        "font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl",
        isEditorial && "max-w-[14ch] text-4xl font-black uppercase leading-[0.98] md:text-5xl",
        isBeauty && "font-semibold md:text-5xl",
        isMenu && "text-4xl font-black md:text-5xl",
        isPlans && "md:text-5xl",
      )}>{sectionTitle}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{helperText}</p>
    </div>
  );

  const sidebar = (
    <aside className={cn(
      "rounded-[var(--sf-card-radius)] border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:p-6",
      featuredExperience === "property" && "rounded-xl border-foreground/15 bg-secondary/25",
      featuredExperience === "inquiry" && "rounded-none border-l-4 border-l-primary",
    )}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{sectionTagline}</p>
      <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">{sectionTitle}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{helperText}</p>
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
    <section
      data-featured-experience={featuredExperience}
      className={cn(
        "relative py-14 md:py-20",
        isBeauty && "bg-gradient-to-b from-background via-primary/[0.035] to-background",
        isTech && "border-y border-border bg-secondary/20",
        isMenu && "bg-gradient-to-b from-amber-50/70 to-background dark:from-amber-950/15",
        isArtisan && "bg-stone-50/75 dark:bg-stone-950/20",
        isPlans && "bg-gradient-to-br from-primary/[0.065] via-background to-secondary/40",
        isSpotlight && "bg-secondary/20",
        featuredExperience === "hotel" && "bg-secondary/20",
        featuredExperience === "property" && "border-y border-border bg-secondary/15",
      )}
      style={sectionStyle}
    >
      <div className={cn("mx-auto px-4", containerClass, isPlans && "max-w-7xl", isSpotlight && "max-w-6xl")}>
        {!useSidebar ? (
          <AnimatedSection animation="blur">
            <div className="mb-8 md:mb-12">{sectionIntro}</div>
          </AnimatedSection>
        ) : null}

        <div
          className={useSidebar ? `grid gap-6 lg:items-start ${sidebarOnRight ? "lg:grid-cols-[minmax(0,1fr)_300px]" : "lg:grid-cols-[300px_minmax(0,1fr)]"}` : ""}
        >
          {useSidebar && !sidebarOnRight ? sidebar : null}
          <div className={cn(
            "grid gap-4 md:gap-6",
            experienceGridClass,
            isBeauty && "md:gap-7 lg:gap-8",
            isEditorial && "gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-10",
            isTech && "gap-3 md:gap-4",
            isPlans && "mx-auto w-full max-w-6xl gap-5 md:gap-6",
            isSpotlight && "mx-auto w-full max-w-5xl gap-6",
          )}>
            {visibleProducts.map((product, index) => (
              <AnimatedSection
                key={product.id}
                delay={Math.min(index, 4) * 70}
                animation="blur"
                className={cn(
                  "h-full",
                  isEditorial && index === 0 && visibleProducts.length >= 4 && "min-[720px]:col-span-2 lg:row-span-2",
                  isSpotlight && index === 0 && visibleProducts.length > 1 && "md:col-span-2",
                  isBeauty && index === 0 && visibleProducts.length >= 5 && "lg:col-span-2",
                )}
              >
                <ProductCard product={product} />
              </AnimatedSection>
            ))}
          </div>
          {useSidebar && sidebarOnRight ? sidebar : null}
        </div>

        {!useSidebar && productsToRender.length > visibleProducts.length ? (
          <div className={cn("mt-8 flex md:mt-10", isEditorial || isTech || isMenu || isArtisan ? "justify-start" : "justify-center")}>
            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                "min-h-11 px-6",
                isEditorial ? "rounded-none" : isTech ? "rounded-lg" : "rounded-full",
              )}
            >
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
