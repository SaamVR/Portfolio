import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type ShopPageVariant =
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
  | "hotel"
  | "real_estate";

function normalizeVariant(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
}

export function resolveShopPageVariant({
  pageShopVariant,
  storeShopVariant,
  templateId,
}: {
  pageShopVariant?: string | null;
  storeShopVariant?: string | null;
  templateId?: StorefrontTemplateId | null;
}): ShopPageVariant {
  const explicit = normalizeVariant(pageShopVariant) || normalizeVariant(storeShopVariant);
  switch (explicit) {
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
    case "hotel":
    case "real_estate":
    case "generic":
      return explicit;
    case "inquiry_catalog":
      return "inquiry";
    case "subscriptions":
      return "subscription";
    case "digital_downloads":
      return "digital";
    case "realestate":
    case "property":
      return "real_estate";
    default:
      break;
  }

  switch (templateId) {
    case "threads":
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
      return "hotel";
    case "real-estate":
      return "real_estate";
    default:
      return "generic";
  }
}
