"use client";

import { Download, HardDrive, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { resolveProductCartSelection } from "@/lib/commerce/product-cart-selection";
import { findCommercialOptionByKind, getActiveCommercialOptions } from "@/lib/commerce/product-commercial-options";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { encodeDigitalCartVariant } from "@/lib/digital-cart";
import { productUrl } from "@/lib/slug";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";
import { FileFormatBadges } from "@/components/storefront/digital-downloads/FileFormatBadges";
import { LicenseSelector } from "@/components/storefront/digital-downloads/LicenseSelector";
import {
  getDigitalCompatibility,
  getDigitalFileSize,
  getDigitalFormats,
  getDigitalLicenses,
  getIncludedFileCount,
  getInstantDownloadInfo,
  type DigitalLicenseOption,
} from "@/components/storefront/digital-downloads/digital-download-utils";
import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

type ReviewStats = {
  count: number;
  average: number;
};

function configuredLicenses(
  product: Product,
  metadata?: TemplateSeedCatalogMetadata["products"][string],
): DigitalLicenseOption[] {
  const commercial = getActiveCommercialOptions(product.commercialOptions).filter((option) => option.kind === "license");
  if (commercial.length > 0) {
    return commercial
      .map((option) => ({
        id: option.id,
        label: option.label,
        description: "Merchant-configured license option.",
        price: product.price + option.priceDelta,
      }))
      .filter((option) => option.price >= 0);
  }
  const variant = (metadata?.variants ?? []).find((item) => /license/i.test(item.name));
  if (!variant?.values?.length) return [];

  return variant.values
    .map((value) => {
      const label = value.label?.trim();
      if (!label) return null;
      const delta = Number(value.price_delta ?? 0);
      return {
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        description: "Merchant-configured license option.",
        price: Math.max(0, product.price + (Number.isFinite(delta) ? Math.round(delta) : 0)),
      };
    })
    .filter((value): value is DigitalLicenseOption => Boolean(value));
}

export function DigitalProductCard({
  product,
  reviewStats,
  metadata,
}: {
  product: Product;
  reviewStats?: ReviewStats;
  metadata?: TemplateSeedCatalogMetadata["products"][string];
}) {
  const currentStore = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const isPreview = isPreviewCatalogStore(currentStore?.id);
  const trustedMetadata = isPreview ? metadata : undefined;
  const trustedSpecs = isPreview ? specs : undefined;
  const formats = useMemo(() => {
    const seededFormats = trustedMetadata?.specs?.formats;
    if (Array.isArray(seededFormats)) {
      return seededFormats.map((value) => String(value).trim().toUpperCase()).filter(Boolean);
    }
    return getDigitalFormats(product, trustedSpecs);
  }, [product, trustedMetadata?.specs, trustedSpecs]);
  const licenses = useMemo(() => {
    const configured = configuredLicenses(product, trustedMetadata);
    return configured.length > 0 ? configured : getDigitalLicenses(product, trustedSpecs);
  }, [product, trustedMetadata, trustedSpecs]);
  const compatibility = useMemo(() => {
    const seededCompatibility = trustedMetadata?.specs?.software_compatibility;
    if (Array.isArray(seededCompatibility)) {
      return seededCompatibility.map((value) => String(value).trim()).filter(Boolean);
    }
    return getDigitalCompatibility(product, trustedSpecs);
  }, [product, trustedMetadata?.specs, trustedSpecs]);
  const [selectedLicenseId, setSelectedLicenseId] = useState(licenses[0]?.id ?? "");
  const selectedLicense = licenses.find((license) => license.id === selectedLicenseId) ?? licenses[0];
  const selectedLicenseCommercial = selectedLicense
    ? findCommercialOptionByKind(product.commercialOptions, "license", selectedLicense.id)
      ?? findCommercialOptionByKind(product.commercialOptions, "license", selectedLicense.label)
    : null;
  const legacyVariantLabel = encodeDigitalCartVariant({ license: selectedLicense?.label ?? "", formats });
  const cartSelection = product.commercialOptions?.length
    ? resolveProductCartSelection(product, selectedLicenseCommercial
        ? [{ groupKey: selectedLicenseCommercial.groupKey, label: selectedLicenseCommercial.label }]
        : [], legacyVariantLabel)
    : null;
  const rating = reviewStats?.average ?? null;
  const reviewCount = reviewStats?.count ?? 0;
  const fileSize = typeof trustedMetadata?.specs?.file_size === "string" && trustedMetadata.specs.file_size.trim()
    ? trustedMetadata.specs.file_size.trim()
    : getDigitalFileSize(product, trustedSpecs);
  const includedFiles = typeof trustedMetadata?.specs?.included_files === "number"
    ? trustedMetadata.specs.included_files
    : getIncludedFileCount(product, trustedSpecs);
  const deliveryInfo = typeof trustedMetadata?.specs?.delivery_time === "string" && trustedMetadata.specs.delivery_time.trim()
    ? trustedMetadata.specs.delivery_time.trim()
    : getInstantDownloadInfo(product, trustedSpecs);
  const isOnSale = typeof product.originalPrice === "number" && product.originalPrice > product.price;
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const hasFileFacts = Boolean(fileSize) || includedFiles !== null || Boolean(deliveryInfo);

  return (
    <ProductCardShell>
      <ProductCardMedia
        src={product.image}
        fallbackSrc={trustedMetadata?.imageUrl ?? trustedMetadata?.imageUrls?.[0] ?? null}
        alt={product.name}
        href={url}
        aspect="4/3"
        fit="contain"
      >
        <ProductCardBadgeLayer
          badge={product.badge || (isOnSale ? "Sale" : "Digital Asset")}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary truncate min-w-0">
          {product.category || product.type || "Digital Download"}
        </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center justify-between gap-2 min-w-0">
          {rating !== null ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Star className="h-3.5 w-3.5 fill-current text-amber-500 shrink-0" />
              <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              <span>{reviewCount > 0 ? `(${reviewCount})` : ""}</span>
            </div>
          ) : <span />}
          {formats.length > 0 ? <FileFormatBadges formats={formats.slice(0, 2)} /> : null}
        </div>

        {licenses.length > 0 ? (
          <LicenseSelector licenses={licenses} value={selectedLicenseId} onChange={setSelectedLicenseId} />
        ) : null}

        {compatibility.length > 0 ? (
          <p className="text-xs text-muted-foreground">Compatible with {compatibility.join(", ")}</p>
        ) : null}

        {hasFileFacts ? (
          <div className="grid gap-1 rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
            {fileSize || includedFiles !== null ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <HardDrive className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{[fileSize, includedFiles !== null ? `${includedFiles} files` : ""].filter(Boolean).join(" • ")}</span>
              </div>
            ) : null}
            {deliveryInfo ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <Download className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{deliveryInfo}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <ProductCardActions>
          <div className="flex items-center justify-between gap-2 w-full pt-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl font-bold text-primary truncate min-w-0">BDT {cartSelection?.unitPrice ?? selectedLicense?.price ?? product.price}</span>
              {isOnSale ? <span className="text-xs text-muted-foreground line-through truncate min-w-0">BDT {product.originalPrice}</span> : null}
            </div>
            <button
              type="button"
              onClick={() => addItem({
                productId: product.id,
                name: product.name,
                price: cartSelection?.unitPrice ?? selectedLicense?.price ?? product.price,
                image: product.image,
                size: cartSelection?.label ?? legacyVariantLabel,
                optionIds: cartSelection?.optionIds ?? [],
                fulfillmentType: cartSelection?.fulfillmentType ?? product.fulfillmentType ?? "digital",
                storeId: currentStore?.id,
              })}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Purchase
            </button>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
