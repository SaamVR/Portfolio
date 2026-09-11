import { Link } from "@/lib/react-router-dom-shim";
import { FolderTree, Grid2x2, Layers3, Package, Sparkles, Store, Tags } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass } from "@/lib/storefront-theme-customization";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { getStorefrontExperienceProfile } from "@/lib/storefront-template-experience";
import { StorefrontSectionEmpty, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";
import { cn } from "@/lib/utils";

interface CategoryShowcaseProps {
  overrides?: {
    disableLegacyFallback?: boolean;
    tagline?: string;
    title?: string;
    layoutVariant?: "cards" | "carousel" | "masonry" | "compact-list" | string;
    source?: "auto" | "categories" | "types" | string;
    limit?: number;
    imagePosition?: string;
    focalX?: number;
    focalY?: number;
  };
}

const getIconForType = (typeName: string) => {
  const normalized = typeName.toLowerCase();
  if (/(new|latest|recent)/.test(normalized)) return Sparkles;
  if (/(bundle|set|kit|pack|collection)/.test(normalized)) return Layers3;
  if (/(feature|highlight|signature|hero)/.test(normalized)) return Store;
  if (/(sale|deal|offer|promo|discount|best)/.test(normalized)) return Tags;
  if (/(catalog|browse|all)/.test(normalized)) return Grid2x2;
  if (/(product|item|menu|service|listing)/.test(normalized)) return Package;
  return FolderTree;
};

const getTaglineForType = (typeName: string) => `Browse ${typeName}`;

const CategoryShowcase = ({ overrides }: CategoryShowcaseProps) => {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const experience = getStorefrontExperienceProfile(templateId);
  const categoryExperience = experience.category;
  const { data: settings } = useSiteSettings<{ tagline?: string; title?: string; fallback_image_url?: string }>("home_categories", storeId);
  const { data: themeCustomization } = useStorefrontThemeCustomization(storeId);
  const { data: customData } = useSiteSettings<any>("categories_custom_data", storeId);
  const legacySettings = overrides?.disableLegacyFallback ? null : settings;
  const source = overrides?.source ?? "auto";
  const limit = overrides?.limit;
  const { data: dbCategories = [], isLoading: categoriesLoading } = useProductCategories(storeId);
  const { data: dbTypes = [], isLoading: typesLoading } = useProductTypes(storeId);
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const imageObjectPosition = resolveStorefrontImageObjectPosition({
    position: overrides?.imagePosition,
    focalX: overrides?.focalX,
    focalY: overrides?.focalY,
  });

  if (categoriesLoading || typesLoading) {
    return <StorefrontSectionSkeleton title={overrides?.title ?? legacySettings?.title ?? "Loading categories"} cards={4} />;
  }

  const categoryItems = dbCategories.map((category) => {
    const custom = customData?.types?.[category.name] ?? {};
    return {
      label: category.name,
      type: category.name,
      tagline: custom.tagline || `Browse ${category.name}`,
      image_url: custom.image_url ?? null,
      icon: FolderTree,
      filterKey: "category" as const,
    };
  });
  const typeItems = dbTypes.map((type) => {
    const custom = customData?.types?.[type.name] ?? {};
    return {
      label: type.name,
      type: type.name,
      tagline: custom.tagline || getTaglineForType(type.name),
      image_url: custom.image_url ?? null,
      icon: getIconForType(type.name),
      filterKey: "type" as const,
    };
  });
  const categoriesToRender = (
    source === "categories"
      ? categoryItems
      : source === "types"
        ? typeItems
        : categoryItems.length > 0
          ? categoryItems
          : typeItems
  ).slice(0, limit || undefined);

  if (categoriesToRender.length === 0) {
    return (
      <StorefrontSectionEmpty
        eyebrow="Browse"
        title={overrides?.title ?? legacySettings?.title ?? "Explore the catalog"}
        description="Categories have not been published for this storefront yet. You can still browse the complete catalog."
        primaryLabel="View all"
        primaryHref={storefrontPath("/shop", currentStore?.slug)}
      />
    );
  }

  const isEditorial = categoryExperience === "editorial-grid";
  const isCarousel = categoryExperience === "ritual-carousel" || categoryExperience === "room-carousel";
  const isMasonry = categoryExperience === "artisan-masonry";
  const isCompact = ["spec-list", "menu-list", "plan-list", "service-list", "booking-list"].includes(categoryExperience);
  const isLandscape = categoryExperience === "property-grid";
  const isTechnical = categoryExperience === "spec-list" || categoryExperience === "digital-grid";
  const isSoft = categoryExperience === "ritual-carousel";
  const isFood = categoryExperience === "menu-list";
  const sectionTitle = overrides?.title ?? legacySettings?.title ?? "Shop by category";
  const sectionTagline = overrides?.tagline ?? legacySettings?.tagline ?? "Browse";

  const gridClass = isCarousel
    ? "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : isMasonry
      ? "columns-1 gap-4 min-[360px]:columns-2 sm:columns-3 lg:columns-4"
      : isEditorial
        ? "grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4 lg:gap-5"
        : isCompact
          ? "mx-auto grid max-w-6xl gap-3 md:grid-cols-2"
          : "grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

  return (
    <section
      data-category-experience={categoryExperience}
      className={cn(
        "relative py-14 md:py-20",
        isSoft && "bg-gradient-to-b from-primary/[0.045] via-background to-background",
        isTechnical && "border-y border-border bg-secondary/20",
        isFood && "bg-gradient-to-b from-amber-50/70 via-background to-background dark:from-amber-950/15",
        isMasonry && "bg-gradient-to-b from-stone-50/80 to-background dark:from-stone-950/25",
      )}
    >
      <div className={`mx-auto px-4 ${containerClass}`}>
        <AnimatedSection animation="blur">
          <div className={cn(
            "mb-8 max-w-3xl md:mb-12",
            isEditorial || isTechnical || isFood || isMasonry ? "text-left" : "text-left sm:mx-auto sm:text-center",
          )}>
            <p className={cn(
              "mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm",
              isEditorial && "tracking-[0.28em]",
              isTechnical && "font-mono tracking-[0.16em] text-primary",
            )}>
              {sectionTagline}
            </p>
            <h2 className={cn(
              "font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl",
              isEditorial && "max-w-[14ch] text-4xl font-black uppercase leading-[0.98] md:text-5xl",
              isSoft && "font-semibold md:text-5xl",
              isFood && "text-4xl font-black md:text-5xl",
            )}>
              {sectionTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Choose the path that matches what you are looking for, then compare the relevant options.
            </p>
          </div>
        </AnimatedSection>

        <div className={gridClass}>
          {categoriesToRender.map((category, index) => {
            const Icon = category.icon;
            const imageLarge = isEditorial || isCarousel || isMasonry || isLandscape;
            return (
              <AnimatedSection
                key={`${category.filterKey}-${category.type}`}
                delay={Math.min(index, 6) * 55}
                animation="blur"
                className={isMasonry ? "mb-4 break-inside-avoid" : ""}
              >
                <Link
                  to={storefrontPath(`/shop?${category.filterKey}=${encodeURIComponent(category.type)}`, currentStore?.slug)}
                  className={cn(
                    "group relative border border-border bg-card shadow-[var(--sf-card-shadow)] transition-[transform,border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-[var(--sf-card-shadow-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring motion-reduce:transition-none",
                    isEditorial && "flex min-h-[270px] flex-col justify-end overflow-hidden rounded-none border-0 bg-foreground text-background shadow-none motion-safe:hover:-translate-y-1",
                    isCarousel && "flex min-h-[250px] min-w-[78vw] snap-center flex-col justify-end overflow-hidden rounded-[2rem] p-5 text-left sm:min-w-[280px]",
                    isMasonry && "flex min-h-[230px] flex-col justify-end gap-4 rounded-[2rem_4rem_2rem_4rem] p-5 text-left",
                    isCompact && "flex min-h-[108px] items-center gap-4 rounded-xl p-4 text-left",
                    isLandscape && "flex min-h-[230px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-left",
                    !isEditorial && !isCarousel && !isMasonry && !isCompact && !isLandscape && "flex min-h-[180px] flex-col items-start gap-4 rounded-[var(--sf-card-radius)] p-4 text-left sm:p-5",
                    !isEditorial && !isCompact && "motion-safe:hover:-translate-y-0.5",
                  )}
                >
                  {category.image_url ? (
                    <div
                      className={cn(
                        "relative overflow-hidden bg-muted",
                        imageLarge && "absolute inset-0 h-full w-full",
                        !imageLarge && "h-16 w-16 shrink-0 rounded-2xl border border-border",
                      )}
                    >
                      <SafeStorefrontImage
                        src={category.image_url}
                        fallbackSrc={settings?.fallback_image_url ?? null}
                        fill
                        alt={category.label}
                        className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.045] motion-reduce:transition-none"
                        style={{ objectPosition: imageObjectPosition }}
                      />
                      {imageLarge ? (
                        <div className={cn(
                          "absolute inset-0",
                          isEditorial ? "bg-gradient-to-t from-black/85 via-black/15 to-transparent" : "bg-gradient-to-t from-black/65 via-black/5 to-transparent",
                        )} />
                      ) : null}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex shrink-0 items-center justify-center border border-primary/25 bg-primary/10 text-primary",
                        imageLarge ? "absolute inset-0 h-full w-full rounded-none bg-gradient-to-br from-primary/20 via-secondary to-background" : "h-14 w-14 rounded-2xl",
                        isTechnical && !imageLarge && "rounded-lg border-primary/35 bg-primary/8",
                        isFood && !imageLarge && "rounded-full",
                      )}
                      aria-hidden="true"
                    >
                      <Icon className={cn("h-5 w-5", imageLarge && "h-12 w-12 opacity-45")} />
                    </div>
                  )}
                  <div className={cn("relative z-10 min-w-0", imageLarge && "mt-auto") }>
                    <p className={cn(
                      "font-heading text-base font-bold leading-6",
                      imageLarge ? "text-white drop-shadow" : "text-foreground",
                      isEditorial && "text-xl uppercase tracking-tight sm:text-2xl",
                      isTechnical && !imageLarge && "font-mono text-sm uppercase tracking-wide",
                      isFood && !imageLarge && "text-lg",
                    )}>
                      {category.label}
                    </p>
                    <p className={cn(
                      "mt-1 line-clamp-2 text-sm leading-5",
                      imageLarge ? "text-white/82" : "text-muted-foreground",
                    )}>
                      {category.tagline}
                    </p>
                  </div>
                </Link>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
