import type { StoreBusinessFamily, StoreCatalogMode } from "@/lib/cms/storefront-template-seeds";

export const allStoreBusinessFamilies = [
  "commerce",
  "booking",
  "listing",
  "service",
  "donation",
] as const satisfies readonly StoreBusinessFamily[];

export const allStoreCatalogModes = [
  "single_product",
  "multi_product",
  "menu",
  "inquiry_only",
  "landing_only",
  "digital_download",
  "multi_vendor",
  "pre_order",
  "donation_tiers",
] as const satisfies readonly StoreCatalogMode[];

export const storefrontProductVisibilityModes = [
  "catalog",
  "single_product",
  "menu",
  "inquiry_only",
  "landing_only",
  "digital_download",
  "multi_vendor",
  "pre_order",
  "donation_tiers",
] as const;

const commerceShopCatalogModes = new Set<StoreCatalogMode>([
  "multi_product",
  "menu",
  "digital_download",
  "multi_vendor",
  "pre_order",
  "inquiry_only",
]);

export function isCommerceCatalogMode(catalogMode: StoreCatalogMode) {
  return commerceShopCatalogModes.has(catalogMode)
    || catalogMode === "single_product"
    || catalogMode === "landing_only";
}

export function supportsDedicatedShopPage(
  businessFamily: StoreBusinessFamily,
  catalogMode: StoreCatalogMode,
) {
  return businessFamily === "commerce" && commerceShopCatalogModes.has(catalogMode);
}

export function supportsTransactionalCheckout(
  businessFamily: StoreBusinessFamily,
  catalogMode: StoreCatalogMode,
) {
  return businessFamily === "commerce"
    && catalogMode !== "landing_only"
    && catalogMode !== "inquiry_only";
}

export function supportsLoyaltyAndUpsells(
  businessFamily: StoreBusinessFamily,
  catalogMode: StoreCatalogMode,
) {
  return supportsTransactionalCheckout(businessFamily, catalogMode);
}

export function isSettingsTabCompatible(
  tabValue: string,
  businessFamily: StoreBusinessFamily,
  catalogMode: StoreCatalogMode,
) {
  if (tabValue === "payment" || tabValue === "delivery") {
    return supportsTransactionalCheckout(businessFamily, catalogMode);
  }

  if (tabValue === "upsells" || tabValue === "loyalty") {
    return supportsLoyaltyAndUpsells(businessFamily, catalogMode);
  }

  if (tabValue === "shop_page") {
    return supportsDedicatedShopPage(businessFamily, catalogMode);
  }

  return true;
}

export function getCatalogModeLabel(catalogMode: StoreCatalogMode) {
  return catalogMode.replace(/_/g, " ");
}
