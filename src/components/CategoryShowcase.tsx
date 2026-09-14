import { FolderTree, Grid2x2, Layers3, Package, Sparkles, Store, Tags } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass } from "@/lib/storefront-theme-customization";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { CategoryVisualStyles } from "@/components/storefront/section-styles/CategoryVisualStyles";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";

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
    items?: Array<{
      label: string;
      value: string;
      tagline?: string;
      imageUrl?: string;
      filterKey?: "category" | "type";
    }>;
    imagePosition?: string;
    focalX?: number;
    focalY?: number;
    variantOptions?: StorefrontVariantOptions;
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
  const preloadedCustomData = currentStore?.siteSettings?.categories_custom_data;
  const resolvedCustomData = customData ?? preloadedCustomData;
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
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isFashion = templateId === "fashion";
  const customCategoryRows = Array.isArray(resolvedCustomData)
    ? resolvedCustomData.filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === "object")
    : [];
  const customTypeData = !Array.isArray(resolvedCustomData) && resolvedCustomData?.types && typeof resolvedCustomData.types === "object"
    ? resolvedCustomData.types as Record<string, Record<string, any>>
    : {};
  const getCustomData = (key: string) => customTypeData[key]
    ?? customCategoryRows.find((entry) => entry.name === key || entry.slug === key)
    ?? {};

  if (categoriesLoading || typesLoading) {
    return <StorefrontSectionSkeleton title={overrides?.title ?? legacySettings?.title ?? "Loading categories"} cards={4} />;
  }

  const categoryItems = dbCategories.map((category) => {
    const custom = getCustomData(category.name);
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
    const custom = getCustomData(t.name);
    return {
      label: t.name,
      type: t.name,
      tagline: custom.tagline || getTaglineForType(t.name),
      image_url: custom.image_url ?? null,
      icon: getIconForType(t.name),
      filterKey: "type" as const,
    };
  });
  const seededCategoryItems = customCategoryRows
    .filter((category) => category.is_active !== false && typeof category.name === "string" && category.name.trim())
    .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
    .map((category) => ({
      label: String(category.name),
      type: String(category.name),
      tagline: typeof category.description === "string" && category.description.trim() ? category.description.trim() : "Explore this collection",
      image_url: typeof category.image_url === "string" && category.image_url.trim() ? category.image_url : null,
      icon: FolderTree,
      filterKey: "category" as const,
    }));
  const explicitItems = (overrides?.items ?? []).map((item) => ({
    label: item.label,
    type: item.value,
    tagline: item.tagline?.trim() || "Explore this collection",
    image_url: item.imageUrl?.trim() || null,
    icon: FolderTree,
    filterKey: item.filterKey ?? "category" as const,
  }));
  const fallbackItems = fallbackCategories.map((cat) => {
    const custom = getCustomData(cat.type);
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
    explicitItems.length > 0
      ? explicitItems
      : source === "categories"
      ? categoryItems.length > 0 ? categoryItems : isFashion ? seededCategoryItems : fallbackItems
      : source === "types"
      ? typeItems.length > 0 ? typeItems : isFashion ? seededCategoryItems : fallbackItems
      : categoryItems.length > 0
      ? categoryItems
      : typeItems.length > 0
      ? typeItems
      : isFashion
      ? seededCategoryItems
      : fallbackItems
  ).slice(0, limit || undefined);

  if (isFashion && categoriesToRender.length === 0) return null;

  return (
    <CategoryVisualStyles
      layoutVariant={layoutVariant}
      tagline={overrides?.tagline ?? legacySettings?.tagline ?? "Explore"}
      title={overrides?.title ?? legacySettings?.title ?? "Browse What This Store Offers"}
      items={categoriesToRender}
      storeSlug={currentStore?.slug}
      fallbackImageUrl={settings?.fallback_image_url ?? null}
      imageObjectPosition={imageObjectPosition}
      containerClass={containerClass}
      variantOptions={overrides?.variantOptions}
    />
  );
};

export default CategoryShowcase;
