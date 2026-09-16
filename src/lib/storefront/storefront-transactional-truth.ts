import type { Product } from "@/data/products";
import { getActiveCommercialOptions } from "@/lib/commerce/product-commercial-options";
import type { ProductDetailVariant } from "@/lib/cms/storefront-product-presentation";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";

function metricStrings(product: Product, keys: string[]) {
  for (const key of keys) {
    const values = product.metricValues?.[key]
      ?.map((value) => value.trim())
      .filter(Boolean);
    if (values?.length) return values;
  }
  return [];
}

export function hasAuthoritativeSubscriptionDetailData(product: Product) {
  const options = getActiveCommercialOptions(product.commercialOptions);
  return options.some((option) => option.kind === "plan")
    && options.some((option) => option.kind === "duration");
}

export function hasAuthoritativeDigitalDetailData(product: Product) {
  const includedFiles = metricStrings(product, ["included_files", "file_count"])[0] ?? "";
  return (
    metricStrings(product, ["licenses", "license", "license_type", "license_tier"]).length > 0 &&
    metricStrings(product, ["formats", "file_formats", "format"]).length > 0 &&
    metricStrings(product, ["software_compatibility", "compatibility", "supported_software"]).length > 0 &&
    metricStrings(product, ["file_size", "download_size"]).length > 0 &&
    /\d/.test(includedFiles) &&
    metricStrings(product, ["delivery_time", "access_time", "fulfillment_time"]).length > 0
  );
}

export function shouldUseTransactionalDetailVariant({
  variant,
  product,
  storeId,
}: {
  variant: ProductDetailVariant;
  product: Product | null | undefined;
  storeId?: string | null;
}) {
  if (variant !== "digital" && variant !== "subscription") return true;
  if (isPreviewCatalogStore(storeId)) return true;
  if (!product) return false;

  if (variant === "digital") {
    return hasAuthoritativeDigitalDetailData(product);
  }

  return hasAuthoritativeSubscriptionDetailData(product);
}
