"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { ArrowUpDown, Filter, Grid2X2, LayoutList, Loader2, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useOptionalStore } from "@/components/storefront/store-context";
import SEOHead from "@/components/SEOHead";
import ProductCard from "@/components/ProductCard";
import ProductQuickView from "@/components/ProductQuickView";
import AnimatedSection from "@/components/AnimatedSection";
import PageTransition from "@/components/PageTransition";
import RecentlyViewed from "@/components/RecentlyViewed";
import type { Product } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { getStorefrontContainerClass, getStorefrontProductGridClass } from "@/lib/storefront-theme-customization";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { buildShopOptions, filterAndSortProducts, type ShopSortOption } from "@/lib/shop-filters";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { resolveShopPageVariant, type ShopPageVariant } from "@/lib/cms/storefront-shop-presentation";
import {
  getDisplayableProductType,
  getProductPresentationSpecs,
  getRenderableColorOptions,
  getRenderableSizeOptions,
  isPhysicalDeliveryKeyword,
  resolveProductCardVariant,
  resolveProductDetailVariant,
  type ProductPresentationSpecs,
} from "@/lib/cms/storefront-product-presentation";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { cn } from "@/lib/utils";

type CatalogRow = { name?: string | null };

export interface ShopPageSettings {
  eyebrow?: string;
  title?: string;
  description?: string;
  search_placeholder?: string;
  empty_title?: string;
  empty_description?: string;
  end_message?: string;
  shop_variant?: string;
  hero_title?: string;
  hero_description?: string;
  hero_badge?: string;
  hero_image?: string;
  default_view?: "grid" | "list" | "map";
  products_per_page?: number;
  category_navigation_style?: "tabs" | "chips" | "strip";
  filter_visibility?: "sidebar" | "drawer" | "toolbar";
  filter_order?: string[];
  enabled_filters?: string[];
  sort_options?: ShopSortOption[];
  newsletter_visible?: boolean;
  promo_title?: string;
  promo_description?: string;
  promo_cta_label?: string;
  promo_cta_href?: string;
  compare_enabled?: boolean;
  show_sale_filter?: boolean;
  show_price_filter?: boolean;
  show_size_filter?: boolean;
  show_color_filter?: boolean;
}

type FilterDefinition = {
  key: string;
  label: string;
  kind: "single" | "multi" | "boolean";
  values: string[];
};

type ProductContext = {
  product: Product;
  specs: ProductPresentationSpecs;
  cardVariant: ReturnType<typeof resolveProductCardVariant>;
  rating: number;
  brand: string;
};

const sortLabels: Record<ShopSortOption, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  rating: "Top Rated",
  "name-asc": "Name",
};

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getString(specs: ProductPresentationSpecs, ...keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getStringArray(specs: ProductPresentationSpecs, ...keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) return [value.trim()];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return [];
}

function getNumber(specs: ProductPresentationSpecs, ...keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function buildProductContexts(products: Product[], metadata: TemplateSeedCatalogMetadata | undefined, templateId: ReturnType<typeof resolveStorefrontTemplateId>) {
  return products.map((product) => {
    const productMeta = metadata?.products?.[product.id] ?? null;
    const specs = getProductPresentationSpecs(product, productMeta);
    const rating = getNumber(specs, "rating") ?? 4.6;
    const brand = getString(specs, "brand", "creator", "vendor");
    return {
      product,
      specs,
      cardVariant: resolveProductCardVariant({
        templateId,
        productType: typeof specs.product_type === "string" ? specs.product_type : product.type,
        displayVariant: typeof specs.display_variant === "string" ? specs.display_variant : null,
        metadata: specs,
      }),
      rating,
      brand,
    } satisfies ProductContext;
  });
}

function getContextValue(context: ProductContext, key: string) {
  const { product, specs, brand, rating } = context;
  const presentationVariant = resolveProductDetailVariant({
    productType: typeof specs.product_type === "string" ? specs.product_type : product.type,
    displayVariant: typeof specs.detail_variant === "string" ? specs.detail_variant : null,
    metadata: specs,
  });
  switch (key) {
    case "category":
    case "menu_category": {
      const displayCategory = getDisplayableProductType(product.category);
      return displayCategory ? [displayCategory] : [];
    }
    case "collection":
      return getStringArray(specs, "collection", "collection_name", "style_collection");
    case "size":
      return getRenderableSizeOptions(product, specs, presentationVariant);
    case "color":
    case "shade":
      return getRenderableColorOptions(product, specs, presentationVariant);
    case "fabric":
      return getStringArray(specs, "fabric", "material");
    case "fit":
      return getStringArray(specs, "fit");
    case "product_type":
    case "service_type":
    case "asset_type":
    case "property_type":
    case "room_type": {
      const displayType = getDisplayableProductType(getString(specs, "product_type") || product.type);
      return displayType ? [displayType] : [];
    }
    case "skin_type":
      return getStringArray(specs, "skin_type");
    case "skin_concern":
      return getStringArray(specs, "skin_concerns", "concerns");
    case "ingredients":
      return getStringArray(specs, "ingredients");
    case "brand":
      return brand ? [brand] : [];
    case "volume":
      return getStringArray(specs, "volume");
    case "model":
      return getStringArray(specs, "model");
    case "technical_specification":
      return getStringArray(specs, "technical_specs", "specifications");
    case "compatibility":
      return getStringArray(specs, "compatibility", "supported_devices");
    case "warranty":
      return getStringArray(specs, "warranty", "warranty_period");
    case "vegetarian":
      return getStringArray(specs, "vegetarian", "dietary_type");
    case "spicy_level":
      return getStringArray(specs, "spice_level");
    case "dietary_type":
      return getStringArray(specs, "dietary_type");
    case "allergens":
      return getStringArray(specs, "allergens", "allergy_info");
    case "preparation_time":
      return getStringArray(specs, "preparation_time", "prep_time");
    case "craft_type":
      return getStringArray(specs, "craft_type", "product_type");
    case "artisan":
      return getStringArray(specs, "artisan");
    case "region":
    case "location":
      return getStringArray(specs, "region", "origin", "location", "city");
    case "handmade_technique":
      return getStringArray(specs, "handmade_technique", "technique");
    case "made_to_order":
      return getStringArray(specs, "made_to_order");
    case "moq":
      return getNumber(specs, "moq") ? [String(getNumber(specs, "moq"))] : [];
    case "customization":
      return getStringArray(specs, "branding_options", "customization");
    case "production_time":
      return getStringArray(specs, "lead_time", "production_time");
    case "duration":
      return getStringArray(specs, "duration");
    case "staff":
      return getStringArray(specs, "staff", "team", "agent");
    case "account_type":
      return getStringArray(specs, "account_type");
    case "billing":
      return getStringArray(specs, "billing_period");
    case "supported_devices":
      return getStringArray(specs, "supported_devices", "compatibility");
    case "activation_time":
      return getStringArray(specs, "activation_time");
    case "file_format":
      return getStringArray(specs, "file_formats");
    case "license":
      return getStringArray(specs, "license_options", "license");
    case "creator":
      return getStringArray(specs, "creator", "brand");
    case "update_access":
      return getStringArray(specs, "update_access");
    case "bed_type":
      return getStringArray(specs, "bed_type");
    case "occupancy":
      return getNumber(specs, "occupancy", "capacity") ? [String(getNumber(specs, "occupancy", "capacity"))] : [];
    case "amenities":
      return getStringArray(specs, "amenities");
    case "refundable":
      return getStringArray(specs, "refundable");
    case "breakfast":
      return getStringArray(specs, "breakfast_included", "breakfast");
    case "listing_type":
      return getStringArray(specs, "listing_type");
    case "bedrooms":
      return getNumber(specs, "bedrooms", "beds") ? [String(getNumber(specs, "bedrooms", "beds"))] : [];
    case "bathrooms":
      return getNumber(specs, "bathrooms", "baths") ? [String(getNumber(specs, "bathrooms", "baths"))] : [];
    case "area":
      return getNumber(specs, "property_area", "area_sqft", "sqft") ? [String(getNumber(specs, "property_area", "area_sqft", "sqft"))] : [];
    case "availability":
      return [product.isAvailable !== false ? "available" : "unavailable"];
    case "discount":
      return [product.originalPrice && product.originalPrice > product.price ? "discounted" : "full-price"];
    case "rating":
      return [String(Math.floor(rating))];
    default:
      return [];
  }
}

function collectFilterValues(contexts: ProductContext[], key: string) {
  return Array.from(
    new Set(
      contexts.flatMap((context) => getContextValue(context, key)).map((value) => value.trim()).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function getFilterDefinitions(variant: ShopPageVariant, contexts: ProductContext[], settings: ShopPageSettings) {
  const base: FilterDefinition[] = [];
  const push = (key: string, label: string, kind: FilterDefinition["kind"] = "multi") => {
    const values = collectFilterValues(contexts, key);
    if (key === "price" || key === "availability" || key === "discount" || values.length > 0) {
      base.push({ key, label, kind, values });
    }
  };

  switch (variant) {
    case "fashion":
      push("category", "Category");
      push("collection", "Collection");
      push("size", "Size");
      push("color", "Color");
      push("fabric", "Fabric");
      push("fit", "Fit");
      push("availability", "Availability", "single");
      push("discount", "Sale", "single");
      break;
    case "beauty":
      push("product_type", "Product Type");
      push("skin_type", "Skin Type");
      push("skin_concern", "Skin Concern");
      push("ingredients", "Ingredients");
      push("brand", "Brand");
      push("shade", "Shade");
      push("volume", "Volume");
      push("availability", "Availability", "single");
      push("rating", "Rating", "single");
      break;
    case "electronics":
      push("category", "Category");
      push("brand", "Brand");
      push("model", "Model");
      push("technical_specification", "Specifications");
      push("compatibility", "Compatibility");
      push("warranty", "Warranty");
      push("availability", "Availability", "single");
      push("rating", "Rating", "single");
      break;
    case "food":
      push("menu_category", "Menu Category");
      push("vegetarian", "Vegetarian", "single");
      push("spicy_level", "Spice Level");
      push("dietary_type", "Dietary");
      push("allergens", "Allergens");
      push("preparation_time", "Preparation");
      push("availability", "Availability", "single");
      break;
    case "crafts":
      push("craft_type", "Craft Type");
      push("material", "Material");
      push("artisan", "Artisan");
      push("region", "Region");
      push("handmade_technique", "Technique");
      push("made_to_order", "Made to Order", "single");
      push("availability", "Availability", "single");
      break;
    case "inquiry":
      push("category", "Category");
      push("material", "Material");
      push("size", "Size");
      push("moq", "MOQ");
      push("customization", "Customization");
      push("production_time", "Production Time");
      break;
    case "service":
      push("service_type", "Service Type");
      push("duration", "Duration");
      push("staff", "Staff");
      push("location", "Location");
      push("rating", "Rating", "single");
      break;
    case "booking":
      push("service_type", "Booking Type");
      push("duration", "Duration");
      push("location", "Location");
      push("capacity", "Capacity");
      break;
    case "subscription":
      push("category", "Category");
      push("billing", "Billing");
      push("duration", "Duration");
      push("account_type", "Account Type");
      push("supported_devices", "Devices");
      push("region", "Region");
      push("activation_time", "Activation");
      break;
    case "digital":
      push("asset_type", "Asset Type");
      push("file_format", "File Format");
      push("compatibility", "Compatibility");
      push("license", "License");
      push("creator", "Creator");
      push("update_access", "Updates");
      break;
    case "hotel":
      push("room_type", "Room Type");
      push("bed_type", "Bed Type");
      push("occupancy", "Guests");
      push("amenities", "Amenities");
      push("refundable", "Refundable", "single");
      push("breakfast", "Breakfast", "single");
      break;
    case "real_estate":
      push("listing_type", "Listing Type");
      push("location", "Location");
      push("property_type", "Property Type");
      push("bedrooms", "Bedrooms");
      push("bathrooms", "Bathrooms");
      push("area", "Area");
      push("amenities", "Amenities");
      push("availability", "Status", "single");
      break;
    default:
      push("category", "Category");
      push("brand", "Brand");
      push("availability", "Availability", "single");
      push("discount", "Discount", "single");
      push("rating", "Rating", "single");
      break;
  }

  const enabled = settings.enabled_filters?.length ? new Set(settings.enabled_filters) : null;
  const filtered = enabled ? base.filter((item) => enabled.has(item.key)) : base;
  if (settings.filter_order?.length) {
    const order = new Map(settings.filter_order.map((value, index) => [value, index]));
    return [...filtered].sort((left, right) => (order.get(left.key) ?? 999) - (order.get(right.key) ?? 999));
  }
  return filtered;
}

function matchesContextFilters(context: ProductContext, params: URLSearchParams, filterDefinitions: FilterDefinition[]) {
  for (const filter of filterDefinitions) {
    const raw = params.get(filter.key);
    if (!raw) continue;
    const selections = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (selections.length === 0) continue;
    const available = getContextValue(context, filter.key).map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (available.length === 0) return false;
    if (!selections.some((selection) => available.some((value) => value.includes(selection) || selection.includes(value)))) {
      return false;
    }
  }
  return true;
}

function sortContexts(contexts: ProductContext[], sort: ShopSortOption) {
  if (sort === "rating") {
    return [...contexts].sort((left, right) => right.rating - left.rating);
  }
  return filterAndSortProducts(
    contexts.map((context) => context.product),
    {
      query: "",
      type: "All",
      category: "All",
      sort,
      saleOnly: false,
      selectedSizes: [],
      selectedColors: [],
    },
  ).map((product) => contexts.find((context) => context.product.id === product.id)!).filter(Boolean);
}

function setParam(params: URLSearchParams, key: string, value: string | null) {
  const next = new URLSearchParams(params);
  if (!value || !value.trim()) next.delete(key);
  else next.set(key, value);
  return next;
}

function clearKnownParams(params: URLSearchParams, filterDefinitions: FilterDefinition[]) {
  const next = new URLSearchParams(params);
  ["q", "type", "category", "sort", "sale", "min", "max", "view", "page", "billing", "check_in", "check_out", "guests", "rooms", "listing_view"].forEach((key) => next.delete(key));
  filterDefinitions.forEach((filter) => next.delete(filter.key));
  return next;
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function SortSelector({ value, options, onChange }: { value: ShopSortOption; options: ShopSortOption[]; onChange: (value: ShopSortOption) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ShopSortOption)}
        className="h-11 rounded-xl border border-border bg-background px-4 pr-10 text-sm text-foreground"
      >
        {options.map((option, index) => <option key={`${option}-${index}`} value={option}>{sortLabels[option]}</option>)}
      </select>
      <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ResultsCount({ count }: { count: number }) {
  return <p className="text-sm text-muted-foreground">Showing <span className="font-medium text-foreground">{count}</span> result{count === 1 ? "" : "s"}</p>;
}

function ActiveFilterChips({ chips, onClear }: { chips: Array<{ key: string; label: string }>; onClear: (key: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button key={`${chip.key}-${chip.label}`} type="button" onClick={() => onClear(chip.key)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

function CategoryTabs({ items, active, onChange, style = "tabs" }: { items: Array<{ label: string; value: string; count: number }>; active: string; onChange: (value: string) => void; style?: ShopPageSettings["category_navigation_style"] }) {
  const chipClass = style === "chips"
    ? "rounded-full"
    : style === "strip"
      ? "rounded-md"
      : "rounded-xl";
  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
      {items.map((item, index) => (
        <button
          key={`${item.value}-${index}`}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            "whitespace-nowrap border px-4 py-2 text-sm font-medium transition-colors",
            chipClass,
            active === item.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
          <span className="ml-2 text-xs opacity-70">{item.count}</span>
        </button>
      ))}
    </div>
  );
}

function FilterField({
  filter,
  params,
  onChange,
}: {
  filter: FilterDefinition;
  params: URLSearchParams;
  onChange: (key: string, value: string | null) => void;
}) {
  const value = params.get(filter.key) ?? "";
  if (filter.values.length === 0 && filter.key !== "availability" && filter.key !== "discount") return null;

  if (filter.kind === "single") {
    return (
      <label className="space-y-2">
        <span className="text-sm font-semibold text-foreground">{filter.label}</span>
        <select value={value} onChange={(event) => onChange(filter.key, event.target.value || null)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="">All</option>
          {Array.from(new Set(filter.values)).map((option, index) => <option key={`${filter.key}-${option}-${index}`} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{filter.label}</span>
      <select value={value} onChange={(event) => onChange(filter.key, event.target.value || null)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
        <option value="">All</option>
        {Array.from(new Set(filter.values)).map((option, index) => <option key={`${filter.key}-${option}-${index}`} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DesktopFilterSidebar({
  filterDefinitions,
  params,
  onChange,
}: {
  filterDefinitions: FilterDefinition[];
  params: URLSearchParams;
  onChange: (key: string, value: string | null) => void;
}) {
  if (filterDefinitions.length === 0) return null;
  return (
    <aside className="hidden w-full max-w-[280px] flex-shrink-0 space-y-4 rounded-3xl border border-border bg-card/50 p-5 lg:block">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
      </div>
      {filterDefinitions.map((filter) => (
        <FilterField key={filter.key} filter={filter} params={params} onChange={onChange} />
      ))}
    </aside>
  );
}

function FilterDrawer({
  open,
  onOpenChange,
  filterDefinitions,
  params,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterDefinitions: FilterDefinition[];
  params: URLSearchParams;
  onChange: (key: string, value: string | null) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
      <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-background p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Filters</h3>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-full border border-border p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          {filterDefinitions.map((filter) => (
            <FilterField key={filter.key} filter={filter} params={params} onChange={onChange} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground lg:hidden">
      <Filter className="h-4 w-4" />
      Filter
    </button>
  );
}

function ProductResultsGrid({ products, onQuickView, className }: { products: Product[]; onQuickView: (product: Product) => void; className: string }) {
  return (
    <div className={className}>
      {products.map((product, index) => (
        <AnimatedSection key={product.id} delay={(index % 8) * 60} animation="blur">
          <ProductCard product={product} onQuickView={onQuickView} />
        </AnimatedSection>
      ))}
    </div>
  );
}

function ProductResultsList({ products, onQuickView }: { products: Product[]; onQuickView: (product: Product) => void }) {
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div key={product.id} className="rounded-3xl border border-border bg-card/60 p-4">
          <ProductCard product={product} onQuickView={onQuickView} />
        </div>
      ))}
    </div>
  );
}

function EmptyResultsState({ title, description, onReset }: { title: string; description: string; onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      <p className="font-heading text-2xl font-bold text-foreground">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>
      <button type="button" onClick={onReset} className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Reset Filters
      </button>
    </div>
  );
}

function LoadMore({ hasMore, onClick }: { hasMore: boolean; onClick: () => void }) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-8">
      <button type="button" onClick={onClick} className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground">
        Load More
      </button>
    </div>
  );
}

function NewsletterSection({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[2rem] border border-border bg-card/50 px-6 py-10 md:px-10">
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Updates</p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-foreground">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row">
          <input type="email" placeholder="Email address" className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground" />
          <button type="submit" className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Subscribe</button>
        </form>
      </div>
    </section>
  );
}

function ShopHero({
  variant,
  settings,
  storeName,
  count,
}: {
  variant: ShopPageVariant;
  settings: ShopPageSettings;
  storeName: string;
  count: number;
}) {
  const badge = settings.hero_badge?.trim()
    || (variant === "food" ? "Menu" : variant === "real_estate" ? "Listings" : variant === "subscription" ? "Plans" : "Catalog");
  const title = settings.hero_title?.trim()
    || settings.title?.trim()
    || (variant === "fashion" ? `Browse ${storeName} collections` : variant === "beauty" ? `Find your ${storeName} routine` : variant === "electronics" ? `Compare ${storeName} devices` : variant === "food" ? `Order from ${storeName}` : variant === "service" ? `Book ${storeName} services` : variant === "hotel" ? `Explore ${storeName} rooms` : variant === "real_estate" ? `Find property with ${storeName}` : `Browse ${storeName}`);
  const description = settings.hero_description?.trim()
    || settings.description?.trim()
    || `Discover ${count} merchant-managed items with filters, search, and storefront-aware browsing.`;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-background via-card to-secondary/50 px-6 py-10 md:px-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{badge}</p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-foreground md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live results</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{count}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Template</p>
            <p className="mt-2 text-sm font-semibold capitalize text-foreground">{variant.replace(/_/g, " ")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Shareable</p>
            <p className="mt-2 text-sm font-semibold text-foreground">All filters sync to URL</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShopToolbar({
  query,
  setQuery,
  sort,
  setSort,
  sortOptions,
  count,
  activeChips,
  clearChip,
  view,
  setView,
  onOpenFilters,
  showMap,
}: {
  query: string;
  setQuery: (value: string) => void;
  sort: ShopSortOption;
  setSort: (value: ShopSortOption) => void;
  sortOptions: ShopSortOption[];
  count: number;
  activeChips: Array<{ key: string; label: string }>;
  clearChip: (key: string) => void;
  view: "grid" | "list" | "map";
  setView: (value: "grid" | "list" | "map") => void;
  onOpenFilters: () => void;
  showMap: boolean;
}) {
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card/40 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search products, services, or listings..." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MobileFilterButton onClick={onOpenFilters} />
          <SortSelector value={sort} options={sortOptions} onChange={setSort} />
          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={() => setView("grid")} className={cn("rounded-xl border px-3 py-2", view === "grid" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}><Grid2X2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setView("list")} className={cn("rounded-xl border px-3 py-2", view === "list" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}><LayoutList className="h-4 w-4" /></button>
            {showMap ? <button type="button" onClick={() => setView("map")} className={cn("rounded-xl border px-3 py-2", view === "map" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}><MapIcon className="h-4 w-4" /></button> : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ResultsCount count={count} />
        <ActiveFilterChips chips={activeChips} onClear={clearChip} />
      </div>
    </div>
  );
}

function VariantSupportSection({
  variant,
  settings,
}: {
  variant: ShopPageVariant;
  settings: ShopPageSettings;
}) {
  const promoTitle = settings.promo_title?.trim()
    || (variant === "electronics" ? "Need help comparing specs?" : variant === "food" ? "Popular combinations" : variant === "subscription" ? "How activation works" : variant === "real_estate" ? "Neighborhoods and agents" : "Curated highlights");
  const promoDescription = settings.promo_description?.trim()
    || (variant === "inquiry" ? "Use Request Quote to gather wholesale requirements without forcing a consumer cart flow." : variant === "hotel" ? "Room availability still stays merchant-controlled while dates and guest counts remain shareable." : "This section can be customized later through CMS-driven shop page settings.");
  const ctaLabel = settings.promo_cta_label?.trim() || "Learn more";
  const ctaHref = settings.promo_cta_href?.trim() || "#";

  return (
    <section className="rounded-[2rem] border border-border bg-card/40 px-6 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shop Support</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-foreground">{promoTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{promoDescription}</p>
        </div>
        <Link href={ctaHref} className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

function MapPanel({ contexts }: { contexts: ProductContext[] }) {
  const items = contexts.filter((context) => getString(context.specs, "address", "location", "city")).slice(0, 8);
  if (items.length === 0) return null;
  return (
    <div className="rounded-[2rem] border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Location Overview</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((context) => (
          <div key={context.product.id} className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="font-semibold text-foreground">{context.product.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{getString(context.specs, "address", "location", "city")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const shopPageRegistry = {
  generic: GenericShopPage,
  fashion: FashionShopPage,
  beauty: BeautyShopPage,
  electronics: ElectronicsShopPage,
  food: FoodMenuShopPage,
  crafts: HandmadeShopPage,
  inquiry: InquiryCatalogPage,
  service: ServiceDirectoryPage,
  booking: BookingDirectoryPage,
  subscription: SubscriptionShopPage,
  digital: DigitalDownloadsShopPage,
  hotel: HotelRoomsPage,
  real_estate: PropertyListingsPage,
} as const;

type RenderProps = {
  shell: React.ReactNode;
  support: React.ReactNode;
  newsletter: React.ReactNode;
  recent: React.ReactNode;
  results: React.ReactNode;
  map: React.ReactNode;
  tabs: React.ReactNode;
  toolbar: React.ReactNode;
};

function GenericShopPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.recent}{props.newsletter}</>;
}
function FashionShopPage(props: RenderProps) {
  return <>{props.shell}{props.support}{props.results}{props.recent}{props.newsletter}</>;
}
function BeautyShopPage(props: RenderProps) {
  return <>{props.shell}{props.support}{props.results}{props.newsletter}</>;
}
function ElectronicsShopPage(props: RenderProps) {
  return <>{props.shell}{props.map}{props.results}{props.support}{props.recent}</>;
}
function FoodMenuShopPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}</>;
}
function HandmadeShopPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}{props.newsletter}</>;
}
function InquiryCatalogPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}</>;
}
function ServiceDirectoryPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}</>;
}
function BookingDirectoryPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}</>;
}
function SubscriptionShopPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}{props.newsletter}</>;
}
function DigitalDownloadsShopPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}{props.newsletter}</>;
}
function HotelRoomsPage(props: RenderProps) {
  return <>{props.shell}{props.results}{props.support}{props.recent}</>;
}
function PropertyListingsPage(props: RenderProps) {
  return <>{props.shell}{props.map}{props.results}{props.support}{props.recent}</>;
}

export default function ContextAwareShopPage({ explicitStoreId }: { explicitStoreId?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackEvent } = useStorefrontAnalytics();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const storeName = currentStore?.name ?? "this store";
  const { data: shopPage } = useSiteSettings<ShopPageSettings>("shop_page", storeId);
  const { data: catalogSeedMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", storeId);
  const { data: themeCustomization } = useStorefrontThemeCustomization(storeId);
  const { data: products = [], isLoading } = useProducts(storeId);
  const { data: productTypeRows = [] } = useProductTypes(storeId);
  const { data: productCategoryRows = [] } = useProductCategories(storeId);

  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings?.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = useMemo(() => resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    blueprintId: typeof storefrontProfile?.blueprint_id === "string" ? storefrontProfile.blueprint_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  }), [storefrontProfile]);
  const shopVariant = resolveShopPageVariant({
    pageShopVariant: shopPage?.shop_variant,
    storeShopVariant: typeof storefrontProfile?.shop_variant === "string" ? storefrontProfile.shop_variant : null,
    templateId,
  });

  const availableProducts = useMemo(() => products.filter((product) => product.isAvailable !== false), [products]);
  const contexts = useMemo(() => buildProductContexts(availableProducts, catalogSeedMetadata ?? undefined, templateId), [availableProducts, catalogSeedMetadata, templateId]);
  const typeOptions = useMemo(() => buildShopOptions(availableProducts, "type", (productTypeRows as CatalogRow[]).map((row) => row.name).filter((value): value is string => Boolean(value))), [availableProducts, productTypeRows]);
  const categoryOptions = useMemo(() => buildShopOptions(availableProducts, "category", (productCategoryRows as CatalogRow[]).map((row) => row.name).filter((value): value is string => Boolean(value))), [availableProducts, productCategoryRows]);
  const filterDefinitions = useMemo(() => getFilterDefinitions(shopVariant, contexts, shopPage ?? {}), [contexts, shopPage, shopVariant]);

  const query = searchParams.get("q") ?? "";
  const activeType = searchParams.get("type") ?? "All";
  const activeCategory = searchParams.get("category") ?? "All";
  const activeSort = ((searchParams.get("sort") as ShopSortOption) || "newest");
  const saleOnly = searchParams.get("sale") === "1";
  const minPrice = searchParams.get("min") ?? "";
  const maxPrice = searchParams.get("max") ?? "";
  const view = (searchParams.get("view") as "grid" | "list" | "map" | null) ?? shopPage?.default_view ?? (shopVariant === "real_estate" ? "map" : "grid");
  const perPage = shopPage?.products_per_page && shopPage.products_per_page > 0 ? shopPage.products_per_page : 12;

  const baseFilteredProducts = useMemo(() => filterAndSortProducts(availableProducts, {
    query,
    type: activeType,
    category: activeCategory,
    sort: activeSort === "rating" || activeSort === "name-asc" ? "newest" : activeSort,
    saleOnly,
    minPrice,
    maxPrice,
    selectedSizes: [],
    selectedColors: [],
  }), [activeCategory, activeSort, activeType, availableProducts, maxPrice, minPrice, query, saleOnly]);

  const filteredContexts = useMemo(() => {
    const baseSet = new Set(baseFilteredProducts.map((product) => product.id));
    const matched = contexts.filter((context) => baseSet.has(context.product.id) && matchesContextFilters(context, searchParams, filterDefinitions));
    return sortContexts(matched, activeSort);
  }, [activeSort, baseFilteredProducts, contexts, filterDefinitions, searchParams]);

  const filteredProducts = filteredContexts.map((context) => context.product);
  const analyticsSnapshotRef = useRef("");
  const quickViewSnapshotRef = useRef("");

  const searchParamSnapshot = searchParams.toString();

  useEffect(() => {
    setDisplayCount(perPage);
  }, [perPage, query, activeType, activeCategory, activeSort, saleOnly, minPrice, maxPrice, searchParamSnapshot]);

  useEffect(() => {
    if (analyticsSnapshotRef.current === searchParamSnapshot) return;
    analyticsSnapshotRef.current = searchParamSnapshot;

    if (query.trim()) {
      trackEvent({
        eventName: "search",
        eventCategory: "discovery",
        searchQuery: query.trim(),
        metadata: {
          resultsCount: filteredProducts.length,
          activeType,
          activeCategory,
          sort: activeSort,
          source: "shop_page",
        },
      });
    }

    if (activeType !== "All") {
      trackEvent({
        eventName: "tag_click",
        eventCategory: "discovery",
        metadata: {
          tag: activeType,
          tagType: "product_type",
          source: "shop_page_filter",
        },
      });
    }

    if (activeCategory !== "All") {
      trackEvent({
        eventName: "tag_click",
        eventCategory: "discovery",
        metadata: {
          tag: activeCategory,
          tagType: "category",
          source: "shop_page_filter",
        },
      });
    }

    const activeFilters = [
      activeType !== "All" ? `type:${activeType}` : "",
      activeCategory !== "All" ? `category:${activeCategory}` : "",
      saleOnly ? "sale:1" : "",
      minPrice ? `min:${minPrice}` : "",
      maxPrice ? `max:${maxPrice}` : "",
      ...filterDefinitions.flatMap((filter) => {
        const value = searchParams.get(filter.key);
        return value ? [`${filter.key}:${value}`] : [];
      }),
    ].filter(Boolean);

    if (activeFilters.length > 0) {
      trackEvent({
        eventName: "filter_used",
        eventCategory: "discovery",
        metadata: {
          filters: activeFilters,
          resultsCount: filteredProducts.length,
          source: "shop_page",
        },
      });
    }

    if (activeSort !== "newest") {
      trackEvent({
        eventName: "sort_changed",
        eventCategory: "discovery",
        metadata: {
          sort: activeSort,
          resultsCount: filteredProducts.length,
          source: "shop_page",
        },
      });
    }
  }, [
    activeCategory,
    activeSort,
    activeType,
    filterDefinitions,
    filteredProducts.length,
    maxPrice,
    minPrice,
    query,
    saleOnly,
    searchParams,
    searchParamSnapshot,
    trackEvent,
  ]);

  useEffect(() => {
    if (!quickViewOpen || !quickViewProduct) return;
    const snapshot = `${quickViewProduct.id}:${quickViewOpen}`;
    if (quickViewSnapshotRef.current === snapshot) return;
    quickViewSnapshotRef.current = snapshot;

    trackEvent({
      eventName: "quick_view_open",
      eventCategory: "engagement",
      productId: quickViewProduct.id,
      value: quickViewProduct.price,
      metadata: {
        productName: quickViewProduct.name,
        category: quickViewProduct.category,
        productType: quickViewProduct.type,
        source: "shop_page",
      },
    });
  }, [quickViewOpen, quickViewProduct, trackEvent]);

  const updateParams = (next: URLSearchParams) => setSearchParams(next);
  const setSingleParam = (key: string, value: string | null) => updateParams(setParam(searchParams, key, value));
  const clearAll = () => updateParams(clearKnownParams(searchParams, filterDefinitions));

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    if (query) chips.push({ key: "q", label: `Search: ${query}` });
    if (activeType !== "All") chips.push({ key: "type", label: activeType });
    if (activeCategory !== "All") chips.push({ key: "category", label: activeCategory });
    if (saleOnly) chips.push({ key: "sale", label: "Sale" });
    filterDefinitions.forEach((filter) => {
      const value = searchParams.get(filter.key);
      if (value) chips.push({ key: filter.key, label: `${filter.label}: ${value}` });
    });
    return chips;
  }, [activeCategory, activeType, filterDefinitions, query, saleOnly, searchParams]);

  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const productGridClass = getStorefrontProductGridClass(themeCustomization?.product_grid);
  const sortOptions: ShopSortOption[] = shopPage?.sort_options?.length
    ? shopPage.sort_options
    : (shopVariant === "beauty" || shopVariant === "electronics"
      ? ["rating", "newest", "price-asc", "price-desc"]
      : ["newest", "price-asc", "price-desc"]);
  const categoryStyle = shopPage?.category_navigation_style ?? (shopVariant === "food" ? "strip" : "tabs");
  const filterVisibility = shopPage?.filter_visibility ?? (shopVariant === "food" || shopVariant === "booking" ? "toolbar" : "sidebar");
  const showMap = shopVariant === "real_estate" || shopVariant === "electronics";
  const displayedProducts = filteredProducts.slice(0, displayCount);

  const tabs = (
    <CategoryTabs
      items={shopVariant === "beauty" || shopVariant === "service" || shopVariant === "booking" || shopVariant === "subscription" ? typeOptions : categoryOptions}
      active={shopVariant === "beauty" || shopVariant === "service" || shopVariant === "booking" || shopVariant === "subscription" ? activeType : activeCategory}
      onChange={(value) => setSingleParam(shopVariant === "beauty" || shopVariant === "service" || shopVariant === "booking" || shopVariant === "subscription" ? "type" : "category", value === "All" ? null : value)}
      style={categoryStyle}
    />
  );

  const toolbar = (
    <ShopToolbar
      query={query}
      setQuery={(value) => setSingleParam("q", value || null)}
      sort={activeSort}
      setSort={(value) => setSingleParam("sort", value === "newest" ? null : value)}
      sortOptions={sortOptions}
      count={filteredProducts.length}
      activeChips={activeChips}
      clearChip={(key) => setSingleParam(key, null)}
      view={view}
      setView={(value) => setSingleParam("view", value === "grid" ? null : value)}
      onOpenFilters={() => setFilterDrawerOpen(true)}
      showMap={showMap}
    />
  );

  const filterSidebar = filterVisibility === "sidebar"
    ? <DesktopFilterSidebar filterDefinitions={filterDefinitions} params={searchParams} onChange={setSingleParam} />
    : null;

  const resultsNode = isLoading ? (
    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  ) : filteredProducts.length === 0 ? (
    <EmptyResultsState
      title={shopPage?.empty_title?.trim() || "No results found"}
      description={shopPage?.empty_description?.trim() || `Try adjusting your filters to discover more from ${storeName}.`}
      onReset={clearAll}
    />
  ) : (
    <div className="space-y-8">
      {view === "list" || shopVariant === "food" || shopVariant === "service" || shopVariant === "booking"
        ? <ProductResultsList products={displayedProducts} onQuickView={(product) => { setQuickViewProduct(product); setQuickViewOpen(true); }} />
        : <ProductResultsGrid products={displayedProducts} onQuickView={(product) => { setQuickViewProduct(product); setQuickViewOpen(true); }} className={`grid gap-6 ${productGridClass}`} />}
      <LoadMore hasMore={displayedProducts.length < filteredProducts.length} onClick={() => setDisplayCount((current) => current + perPage)} />
      {displayedProducts.length >= filteredProducts.length && filteredProducts.length > 0 ? (
        <p className="text-center text-sm text-muted-foreground">{shopPage?.end_message?.trim() || `You have reached the end of the ${storeName} results.`}</p>
      ) : null}
    </div>
  );

  const shell = (
    <div className="space-y-8">
      <AnimatedSection animation="blur">
        <nav className="text-sm text-muted-foreground">
          <span>Home</span> <span className="mx-2">/</span> <span className="text-foreground">Shop</span>
        </nav>
      </AnimatedSection>
      <AnimatedSection animation="blur">
        <ShopHero variant={shopVariant} settings={shopPage ?? {}} storeName={storeName} count={filteredProducts.length || availableProducts.length} />
      </AnimatedSection>
      <AnimatedSection delay={80} animation="blur">{tabs}</AnimatedSection>
      <AnimatedSection delay={120} animation="blur">{toolbar}</AnimatedSection>
    </div>
  );

  const results = (
    <div className="flex flex-col gap-8 lg:flex-row">
      {filterSidebar}
      <div className="min-w-0 flex-1 space-y-8">{resultsNode}</div>
    </div>
  );

  const newsletter = (shopPage?.newsletter_visible ?? true)
    ? <NewsletterSection title={`Stay in touch with ${storeName}`} description="Use this section for launches, offers, or merchant updates without changing the core commerce flow." />
    : null;
  const support = <VariantSupportSection variant={shopVariant} settings={shopPage ?? {}} />;
  const recent = <RecentlyViewed title={shopVariant === "real_estate" ? "Recently Viewed Properties" : "Recently Viewed"} />;
  const map = view === "map" || shopVariant === "real_estate" ? <MapPanel contexts={filteredContexts} /> : null;

  const Renderer = shopPageRegistry[shopVariant] ?? shopPageRegistry.generic;
  const LayoutWrapper = storeId ? StorefrontLayout : Layout;

  return (
    <LayoutWrapper>
      {!explicitStoreId ? (
        <SEOHead
          title={shopPage?.title?.trim() || "Shop"}
          description={shopPage?.description?.trim() || `Browse ${storeName}.`}
          canonical={absoluteStoreUrl(currentStore, "/shop")}
        />
      ) : null}
      <PageTransition>
        <section className="py-14 md:py-16">
          <div className={`mx-auto px-4 ${containerClass}`}>
            <Renderer
              shell={shell}
              support={support}
              newsletter={newsletter}
              recent={recent}
              results={results}
              map={map}
              tabs={tabs}
              toolbar={toolbar}
            />
          </div>
        </section>
      </PageTransition>
      <FilterDrawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen} filterDefinitions={filterDefinitions} params={searchParams} onChange={setSingleParam} />
      <ProductQuickView product={quickViewProduct} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </LayoutWrapper>
  );
}
