"use client";

import { useMemo } from "react";
import type { Product } from "@/data/products";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import {
  getProductPresentationSpecs,
  resolveProductCardVariant,
  resolveProductDetailVariant,
  type ProductCardVariant,
  type ProductDetailVariant,
} from "@/lib/cms/storefront-product-presentation";
import { normalizePresentationMetricSpecs } from "@/lib/cms/product-metrics";
import { resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { shouldUseTransactionalDetailVariant } from "@/lib/storefront/storefront-transactional-truth";

export function useStoreProductPresentation(product: Product | null | undefined) {
  const currentStore = useOptionalStore();
  const { data: catalogSeedMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", currentStore?.id);

  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings?.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;

  const templateId = useMemo<StorefrontTemplateId | null>(() => {
    if (!currentStore) return null;
    return resolveStorefrontTemplateId(storefrontProfile?.template_id, {
      templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
      productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
    });
  }, [currentStore, storefrontProfile]);

  const metadata = product ? catalogSeedMetadata?.products?.[product.id] ?? null : null;
  const specs = useMemo(
    () => normalizePresentationMetricSpecs(getProductPresentationSpecs(product, metadata)),
    [metadata, product],
  );
  const displayVariant = typeof specs.display_variant === "string" ? specs.display_variant : null;
  const detailVariant = typeof specs.detail_variant === "string" ? specs.detail_variant : null;
  const productType = typeof specs.product_type === "string" ? specs.product_type : product?.type ?? null;

  const cardVariant = useMemo<ProductCardVariant>(() => resolveProductCardVariant({
    templateId,
    productType,
    displayVariant,
    metadata: specs,
  }), [displayVariant, productType, specs, templateId]);

  const candidateDetailVariant = useMemo<ProductDetailVariant>(() => resolveProductDetailVariant({
    templateId,
    productType,
    displayVariant: detailVariant,
    metadata: specs,
  }), [detailVariant, productType, specs, templateId]);

  const resolvedDetailVariant = useMemo<ProductDetailVariant>(() => (
    shouldUseTransactionalDetailVariant({
      variant: candidateDetailVariant,
      product,
      storeId: currentStore?.id,
    })
      ? candidateDetailVariant
      : "generic"
  ), [candidateDetailVariant, currentStore?.id, product]);

  return {
    templateId,
    cardVariant,
    detailVariant: resolvedDetailVariant,
    metadata,
    specs,
  };
}
