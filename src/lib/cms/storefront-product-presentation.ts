import type { Product } from "@/data/products";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type ProductCardVariant =
  | "generic"
  | "fashion"
  | "beauty"
  | "electronics"
  | "food"
  | "crafts"
  | "inquiry"
  | "service"
  | "booking"
  | "subscription"
  | "digital"
  | "hotel_room"
  | "property";

export type ProductDetailVariant =
  | "generic"
  | "fashion"
  | "beauty"
  | "electronics"
  | "food"
  | "crafts"
  | "inquiry"
  | "service"
  | "booking"
  | "subscription"
  | "digital"
  | "hotel_room"
  | "property"
  | "single_product";

export type ProductPresentationVariant = ProductCardVariant | ProductDetailVariant;

export type ProductPresentationSpecs = Partial<{
  product_type: string;
  display_variant: string;
  detail_variant: string;
  category_slug: string;
  brand: string;
  pricing: unknown;
  images: string[];
  variants: unknown[];
  rating: number;
  badge: string;
  inventory: unknown;
  specs: Record<string, unknown>;
  size: string | string[];
  color: string | string[];
  material: string;
  ingredients: string | string[];
  skin_type: string | string[];
  concerns: string | string[];
  volume: string;
  warranty: string;
  technical_specs: Record<string, unknown> | string[];
  preparation_time: string;
  spice_level: string;
  allergens: string | string[];
  artisan: string;
  origin: string;
  moq: number | string;
  branding_options: string | string[];
  lead_time: string;
  duration: string;
  capacity: number | string;
  account_type: string;
  billing_period: string;
  activation_time: string;
  file_formats: string | string[];
  license_options: string | string[];
  compatibility: string | string[];
  included_files: string | string[];
  room_size: string;
  bed_type: string;
  occupancy: number | string;
  amenities: string | string[];
  bedrooms: number | string;
  bathrooms: number | string;
  property_area: string | number;
  listing_type: string;
  address: string;
  agent: string | Record<string, unknown>;
  size_chart: boolean | string;
}> & Record<string, unknown>;

function normalizeVariant(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
}

function getProductRecordValue(product: Product | null | undefined, key: string) {
  if (!product) return undefined;
  const record = product as Product & Record<string, unknown>;
  return record[key];
}

export function getProductPresentationSpecs(product: Product | null | undefined, metadata?: Record<string, unknown> | null): ProductPresentationSpecs {
  const rawSpecs = metadata?.specs;
  const specs = typeof rawSpecs === "object" && rawSpecs ? { ...(rawSpecs as Record<string, unknown>) } : {};
  const merged = {
    ...metadata,
    ...specs,
  } as ProductPresentationSpecs;

  const displayVariant = typeof merged.display_variant === "string" ? merged.display_variant : getProductRecordValue(product as Product, "display_variant");
  const detailVariant = typeof merged.detail_variant === "string" ? merged.detail_variant : getProductRecordValue(product as Product, "detail_variant");
  const productType = typeof merged.product_type === "string" ? merged.product_type : getProductRecordValue(product as Product, "product_type");
  const brand = typeof merged.brand === "string" ? merged.brand : getProductRecordValue(product as Product, "brand");

  if (typeof displayVariant === "string" && displayVariant.trim()) merged.display_variant = displayVariant;
  if (typeof detailVariant === "string" && detailVariant.trim()) merged.detail_variant = detailVariant;
  if (typeof productType === "string" && productType.trim()) merged.product_type = productType;
  if (typeof brand === "string" && brand.trim()) merged.brand = brand;
  if (!merged.images?.length && product?.images?.length) merged.images = product.images;

  return merged;
}

function getExplicitPresentationVariant(displayVariant: string): ProductPresentationVariant | null {
  switch (displayVariant) {
    case "generic":
    case "fashion":
    case "beauty":
    case "electronics":
    case "food":
    case "crafts":
    case "inquiry":
    case "service":
    case "booking":
    case "subscription":
    case "digital":
    case "hotel_room":
    case "property":
    case "single_product":
      return displayVariant;
    case "handmade":
      return "crafts";
    case "digital_download":
      return "digital";
    case "hotel_room_card":
    case "hotel":
    case "hotel_room_details":
      return "hotel_room";
    case "property_listing":
    case "real_estate":
      return "property";
    case "single_product_launch":
      return "single_product";
    default:
      return null;
  }
}

function getVariantFromProductType(productType: string): ProductPresentationVariant | null {
  if (!productType) return null;
  if (/(subscription|membership|plan|account)/.test(productType)) return "subscription";
  if (/(digital|download|asset|template|preset|license)/.test(productType)) return "digital";
  if (/(service|consultation|package)/.test(productType)) return "service";
  if (/(booking|appointment|reservation)/.test(productType)) return "booking";
  if (/(room|suite|villa|hospitality|stay)/.test(productType)) return "hotel_room";
  if (/(property|listing|apartment|condo|house|real_estate|real estate)/.test(productType)) return "property";
  if (/(food|dish|meal|drink|bakery|menu)/.test(productType)) return "food";
  if (/(beauty|cosmetic|skincare|makeup|haircare|wellness)/.test(productType)) return "beauty";
  if (/(electronics|gadget|device|appliance|tech|accessory)/.test(productType)) return "electronics";
  if (/(craft|handmade|artisan|heritage)/.test(productType)) return "crafts";
  if (/(wholesale|inquiry|moq|b2b|quote)/.test(productType)) return "inquiry";
  if (/(fashion|apparel|clothing|garment|wear)/.test(productType)) return "fashion";
  return null;
}

function getVariantFromTemplate(templateId: StorefrontTemplateId | null | undefined): ProductPresentationVariant {
  switch (templateId) {
    case "fashion":
      return "fashion";
    case "beauty":
      return "beauty";
    case "electronics":
      return "electronics";
    case "food":
      return "food";
    case "crafts":
      return "crafts";
    case "inquiry-catalog":
      return "inquiry";
    case "service":
      return "service";
    case "booking":
      return "booking";
    case "subscriptions":
      return "subscription";
    case "digital-downloads":
      return "digital";
    case "hotel":
      return "hotel_room";
    case "real-estate":
      return "property";
    case "single-product":
      return "single_product";
    default:
      return "generic";
  }
}

export function resolveProductCardVariant({
  templateId,
  productType,
  displayVariant,
  metadata,
}: {
  templateId?: StorefrontTemplateId | null;
  productType?: string | null;
  displayVariant?: string | null;
  metadata?: Record<string, unknown> | null;
}): ProductCardVariant {
  const explicit = getExplicitPresentationVariant(normalizeVariant(displayVariant ?? metadata?.display_variant));
  if (explicit && explicit !== "single_product") {
    return explicit as ProductCardVariant;
  }

  const fromType = getVariantFromProductType(normalizeVariant(productType ?? metadata?.product_type));
  if (fromType && fromType !== "single_product") {
    return fromType as ProductCardVariant;
  }

  const fromTemplate = getVariantFromTemplate(templateId);
  if (fromTemplate === "single_product") {
    return "fashion";
  }
  return fromTemplate as ProductCardVariant;
}

export function resolveProductDetailVariant({
  templateId,
  productType,
  displayVariant,
  metadata,
}: {
  templateId?: StorefrontTemplateId | null;
  productType?: string | null;
  displayVariant?: string | null;
  metadata?: Record<string, unknown> | null;
}): ProductDetailVariant {
  const explicit = getExplicitPresentationVariant(normalizeVariant(displayVariant ?? metadata?.detail_variant));
  if (explicit) {
    return explicit as ProductDetailVariant;
  }

  const fromType = getVariantFromProductType(normalizeVariant(productType ?? metadata?.product_type));
  if (fromType) {
    return fromType as ProductDetailVariant;
  }

  return getVariantFromTemplate(templateId) as ProductDetailVariant;
}

function normalizedOptions(values: string[] | undefined | null) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function getStringListFromSpecs(specs: ProductPresentationSpecs, keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) return [value.trim()];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return [];
}

export function isPhysicalDeliveryKeyword(value?: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/[-_]+/g, " ");
  return (
    normalized === "physical" ||
    normalized === "physical delivery" ||
    normalized === "physical_delivery" ||
    normalized === "physical product" ||
    normalized === "physical item" ||
    normalized.includes("physical delivery") ||
    normalized.includes("physical_delivery") ||
    normalized.startsWith("physical")
  );
}

export function getDisplayableProductType(productType?: string | null): string | null {
  if (!productType) return null;
  if (isPhysicalDeliveryKeyword(productType)) return null;
  return productType.trim();
}

function isApparelLikeProduct(product: Product, specs: ProductPresentationSpecs, variant: ProductPresentationVariant) {
  if (variant === "fashion") return true;
  const productType = `${specs.product_type ?? product.type ?? ""}`.toLowerCase();
  const category = `${specs.category_slug ?? product.category ?? ""}`.toLowerCase();
  return /(fashion|apparel|clothing|garment|wear|shirt|tee|t-shirt|polo|pant|trouser|dress|jacket|hoodie)/.test(`${productType} ${category}`);
}

export function getRenderableColorOptions(product: Product, specs: ProductPresentationSpecs, variant: ProductPresentationVariant) {
  const seededColors = getStringListFromSpecs(specs, ["color", "colors", "shade", "shades"]);
  const productColors = normalizedOptions(product.colors);
  const colors = [...new Set([...seededColors, ...productColors])].filter((value) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (isPhysicalDeliveryKeyword(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    if (
      [
        "default",
        "n/a",
        "na",
        "none",
        "standard",
        "one color",
        "no color",
        "color",
        "colors",
        "physical",
        "1",
        "0",
        "size",
        "sizes",
      ].includes(lower)
    ) {
      return false;
    }
    if (/^\d+\s*(ml|g|oz|kg|lb|cl|l)$/i.test(lower)) return false;
    return true;
  });
  if (colors.length === 0) return [];
  if (
    variant === "food" ||
    variant === "service" ||
    variant === "booking" ||
    variant === "subscription" ||
    variant === "digital" ||
    variant === "hotel_room" ||
    variant === "property" ||
    variant === "inquiry"
  ) {
    return [];
  }
  return colors;
}

export function getRenderableSizeOptions(product: Product, specs: ProductPresentationSpecs, variant: ProductPresentationVariant) {
  const seededSizes = getStringListFromSpecs(specs, ["size", "sizes", "volume", "portion_sizes", "serving_sizes"]);
  const productSizes = normalizedOptions(product.sizes);
  const sizes = [...new Set([...seededSizes, ...productSizes])].filter((value) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (isPhysicalDeliveryKeyword(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    if (
      [
        "default",
        "n/a",
        "na",
        "none",
        "standard",
        "one size",
        "no size",
        "size",
        "sizes",
        "physical",
        "1",
        "0",
        "color",
        "colors",
      ].includes(lower)
    ) {
      return false;
    }
    return true;
  });
  if (sizes.length === 0) return [];
  if (variant === "property" || variant === "hotel_room" || variant === "subscription" || variant === "digital" || variant === "inquiry") {
    return [];
  }
  return sizes;
}

export function shouldShowColorOptions(product: Product, specs: ProductPresentationSpecs, variant: ProductPresentationVariant) {
  return getRenderableColorOptions(product, specs, variant).length > 0;
}

export function shouldShowSizeOptions(product: Product, specs: ProductPresentationSpecs, variant: ProductPresentationVariant) {
  return getRenderableSizeOptions(product, specs, variant).length > 0;
}

export function shouldShowSizeGuide(product: Product, specs: ProductPresentationSpecs, variant: ProductPresentationVariant) {
  if (!isApparelLikeProduct(product, specs, variant)) return false;
  if (typeof specs.size_chart === "boolean") return specs.size_chart;
  if (typeof specs.size_chart === "string") return !["false", "0", "off", "no"].includes(specs.size_chart.trim().toLowerCase());
  return getRenderableSizeOptions(product, specs, variant).length > 0;
}
