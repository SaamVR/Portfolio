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
import { StorefrontSectionEmpty, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";

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
  const { data: settings } = useSiteSettings<{ tagline?: string; title?: string; fallback_image_url?: string }>("home_categories", storeId);
  const { data: themeCustomization } = useStorefrontThemeCustomization(storeId);
  const { data: customData } = useSiteSettings<any>("categories_custom_data", storeId);
  const legacySettings = overrides?.disableLegacyFallback ? null : settings;
  const layoutVariant = overrides?.layoutVariant ?? "cards";
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

  return (
    <section className="py-14 md:py-20">
      <div className={`mx-auto px-4 ${containerClass}`}>
        <AnimatedSection animation="blur">
          <div className="mb-8 max-w-3xl text-left sm:mx-auto sm:text-center md:mb-12">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
              {overrides?.tagline ?? legacySettings?.tagline ?? "Browse"}
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {overrides?.title ?? legacySettings?.title ?? "Shop by category"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              Choose a section to narrow the catalog without adding unnecessary steps.
            </p>
          </div>
        </AnimatedSection>

        <div
          className={
            layoutVariant === "carousel"
              ? "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : layoutVariant === "masonry"
                ? "columns-1 gap-4 min-[360px]:columns-2 sm:columns-3 lg:columns-4"
                : layoutVariant === "compact-list"
                  ? "mx-auto grid max-w-4xl gap-3 sm:grid-cols-2"
                  : "grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          }
        >
          {categoriesToRender.map((category, index) => {
            const Icon = category.icon;
            return (
              <AnimatedSection
                key={`${category.filterKey}-${category.type}`}
                delay={Math.min(index, 6) * 60}
                animation="blur"
                className={layoutVariant === "masonry" ? "mb-4 break-inside-avoid" : ""}
              >
                <Link
                  to={storefrontPath(`/shop?${category.filterKey}=${encodeURIComponent(category.type)}`, currentStore?.slug)}
                  className={[
                    "group border border-border bg-card shadow-[var(--sf-card-shadow)] transition-[transform,border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-md motion-reduce:transition-none",
                    layoutVariant === "compact-list"
                      ? "flex min-h-20 items-center gap-4 rounded-[var(--sf-card-radius)] p-4 text-left"
                      : layoutVariant === "carousel"
                        ? "flex min-h-[190px] min-w-[76vw] snap-center flex-col items-start justify-end gap-4 rounded-[var(--sf-card-radius)] p-5 text-left sm:min-w-[250px]"
                        : layoutVariant === "masonry"
                          ? "flex min-h-[210px] flex-col items-start justify-end gap-4 rounded-[var(--sf-card-radius)] p-5 text-left"
                          : "flex min-h-[150px] flex-col items-start gap-4 rounded-[var(--sf-card-radius)] p-4 text-left sm:p-5",
                    layoutVariant !== "compact-list" && "motion-safe:hover:-translate-y-0.5",
                  ].filter(Boolean).join(" ")}
                >
                  {category.image_url ? (
                    <div
                      className={[
                        "relative overflow-hidden border border-border bg-muted transition-[border-color,box-shadow] duration-200 group-hover:border-primary/50 group-hover:shadow-md motion-reduce:transition-none",
                        layoutVariant === "masonry" || layoutVariant === "carousel" ? "h-28 w-full rounded-xl" : "h-16 w-16 rounded-2xl",
                      ].filter(Boolean).join(" ")}
                    >
                      <SafeStorefrontImage
                        src={category.image_url}
                        fallbackSrc={settings?.fallback_image_url ?? null}
                        fill
                        alt={category.label}
                        className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
                        style={{ objectPosition: imageObjectPosition }}
                      />
                    </div>
                  ) : (
                    <div
                      className={[
                        "flex shrink-0 items-center justify-center border border-primary/25 bg-primary/10 text-primary",
                        layoutVariant === "masonry" || layoutVariant === "carousel" ? "h-12 w-12 rounded-xl" : "h-14 w-14 rounded-2xl",
                      ].filter(Boolean).join(" ")}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-heading text-base font-bold leading-6 text-foreground">{category.label}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{category.tagline}</p>
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
