import { useEffect, useState } from "react";
import { Link } from "@/lib/react-router-dom-shim";
import { FolderTree, Grid2x2, Layers3, Package, Sparkles, Store, Tags } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass } from "@/lib/storefront-theme-customization";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";

const fallbackCategories = [
  { label: "Featured", type: "featured", tagline: "Highlighted items, offers, or experiences", icon: Sparkles, filterKey: "category" as const },
  { label: "New Arrivals", type: "new-arrivals", tagline: "Recently added products or listings", icon: Package, filterKey: "category" as const },
  { label: "Collections", type: "collections", tagline: "Curated groups for faster browsing", icon: Layers3, filterKey: "category" as const },
  { label: "Best Sellers", type: "best-sellers", tagline: "Popular picks customers revisit most", icon: Tags, filterKey: "category" as const },
  { label: "Browse All", type: "browse-all", tagline: "Explore the full storefront catalog", icon: Grid2x2, filterKey: "category" as const },
  { label: "Store Highlights", type: "store-highlights", tagline: "What this business wants customers to notice first", icon: Store, filterKey: "category" as const },
];

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

const getTaglineForType = (typeName: string) => {
  const normalized = typeName.toLowerCase();

  if (/(new|latest|recent)/.test(normalized)) return "Freshly added options";
  if (/(bundle|set|kit|pack|collection)/.test(normalized)) return "Grouped offers and curated sets";
  if (/(feature|highlight|signature|hero)/.test(normalized)) return "What this storefront wants to spotlight";
  if (/(sale|deal|offer|promo|discount|best)/.test(normalized)) return "Popular and conversion-focused picks";
  if (/(catalog|browse|all)/.test(normalized)) return "Open up the wider catalog";
  if (/(product|item|menu|service|listing)/.test(normalized)) return "Explore this part of the storefront";

  return "Explore this category";
};

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
  const [dbTypes, setDbTypes] = useState<any[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const imageObjectPosition = resolveStorefrontImageObjectPosition({
    position: overrides?.imagePosition,
    focalX: overrides?.focalX,
    focalY: overrides?.focalY,
  });

  useEffect(() => {
    const loadTypes = async () => {
      if (!storeId) {
        setDbTypes([]);
        return;
      }

      setTypesLoading(true);
      try {
        const { data } = await supabase.from("product_types").select("*").eq("store_id", storeId).order("sort_order");
        setDbTypes(data ?? []);
      } catch (err) {
        console.error("Failed to load product types", err);
      } finally {
        setTypesLoading(false);
      }
    };
    loadTypes();
  }, [storeId]);

  if (categoriesLoading || typesLoading) {
    return <StorefrontSectionSkeleton title={overrides?.title ?? legacySettings?.title ?? "Loading categories"} cards={4} />;
  }

  const categoryItems = dbCategories.map((category) => {
    const custom = customData?.types?.[category.name] ?? {};
    return {
      label: category.name,
      type: category.name,
      tagline: custom.tagline || "Explore this category",
      image_url: custom.image_url ?? null,
      icon: FolderTree,
      filterKey: "category" as const,
    };
  });
  const typeItems = dbTypes.map((t) => {
    const custom = customData?.types?.[t.name] ?? {};
    return {
      label: t.name,
      type: t.name,
      tagline: custom.tagline || getTaglineForType(t.name),
      image_url: custom.image_url ?? null,
      icon: getIconForType(t.name),
      filterKey: "type" as const,
    };
  });
  const fallbackItems = fallbackCategories.map((cat) => {
    const custom = customData?.types?.[cat.type] ?? {};
    return {
      label: cat.label,
      type: cat.type,
      tagline: custom.tagline || cat.tagline,
      image_url: custom.image_url ?? null,
      icon: cat.icon,
      filterKey: cat.filterKey,
    };
  });
  const categoriesToRender = (
    source === "categories"
      ? categoryItems.length > 0 ? categoryItems : fallbackItems
      : source === "types"
      ? typeItems.length > 0 ? typeItems : fallbackItems
      : categoryItems.length > 0
      ? categoryItems
      : typeItems.length > 0
      ? typeItems
      : fallbackItems
  ).slice(0, limit || undefined);

  return (
    <section className="py-14 md:py-20">
      <div className={`mx-auto px-4 ${containerClass}`}>
        <AnimatedSection animation="blur">
          <div className="mb-8 text-center md:mb-12">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">{overrides?.tagline ?? legacySettings?.tagline ?? "Explore"}</p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{overrides?.title ?? legacySettings?.title ?? "Browse What This Store Offers"}</h2>
          </div>
        </AnimatedSection>

        <div
          className={
            layoutVariant === "carousel"
              ? "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : layoutVariant === "masonry"
                ? "columns-2 gap-4 sm:columns-3 lg:columns-4"
                : layoutVariant === "compact-list"
                  ? "mx-auto grid max-w-4xl gap-3 sm:grid-cols-2"
                  : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6"
          }
        >
          {categoriesToRender.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <AnimatedSection key={cat.type} delay={i * 60} animation="blur" className={layoutVariant === "masonry" ? "mb-4 break-inside-avoid" : ""}>
                <Link
                  to={storefrontPath(`/shop?${cat.filterKey}=${encodeURIComponent(cat.type)}`, currentStore?.slug)}
                  className={[
                    "group border border-border bg-card smooth-hover hover:border-primary/40 hover:premium-shadow",
                    layoutVariant === "compact-list"
                      ? "flex items-center gap-4 rounded-lg p-4 text-left hover:-translate-y-0"
                      : layoutVariant === "carousel"
                        ? "flex min-w-[72vw] snap-center flex-col items-center gap-3 rounded-xl p-6 text-center hover:-translate-y-1 sm:min-w-[240px]"
                        : layoutVariant === "masonry"
                          ? "flex min-h-[190px] flex-col items-start justify-end gap-3 rounded-lg p-5 text-left hover:-translate-y-1"
                          : "flex flex-col items-center gap-3 rounded-xl p-4 text-center hover:-translate-y-1 sm:p-6",
                  ].filter(Boolean).join(" ")}
                >
                  {cat.image_url ? (
                    <div className={[
                      "relative overflow-hidden border-2 border-border group-hover:border-primary smooth-hover group-hover:shadow-[0_0_20px_hsla(145,63%,42%,0.25)]",
                      layoutVariant === "masonry" ? "h-28 w-full rounded-lg" : "h-14 w-14 rounded-full",
                    ].filter(Boolean).join(" ")}>
                      <SafeStorefrontImage
                        src={cat.image_url}
                        fallbackSrc={settings?.fallback_image_url ?? null}
                        fill
                        alt={cat.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        style={{ objectPosition: imageObjectPosition }}
                      />
                    </div>
                  ) : (
                    <div className={[
                      "flex shrink-0 items-center justify-center bg-primary/10 text-primary smooth-hover group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_hsla(145,63%,42%,0.25)]",
                      layoutVariant === "masonry" ? "h-12 w-12 rounded-lg" : "h-14 w-14 rounded-full",
                    ].filter(Boolean).join(" ")}>
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">{cat.label}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{cat.tagline}</p>
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
