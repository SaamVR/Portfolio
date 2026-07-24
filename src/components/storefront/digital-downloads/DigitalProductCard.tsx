"use client";

import Link from "next/link";
import { Download, HardDrive, MonitorSmartphone, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { encodeDigitalCartVariant } from "@/lib/digital-cart";
import { productUrl } from "@/lib/slug";
import { FileFormatBadges } from "@/components/storefront/digital-downloads/FileFormatBadges";
import { LicenseSelector } from "@/components/storefront/digital-downloads/LicenseSelector";
import {
  getDigitalCompatibility,
  getDigitalFileSize,
  getDigitalFormats,
  getDigitalLicenses,
  getIncludedFileCount,
  getInstantDownloadInfo,
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
  const formats = useMemo(() => {
    const seededFormats = metadata?.specs?.formats;
    if (Array.isArray(seededFormats)) {
      return seededFormats.map((value) => String(value).trim().toUpperCase()).filter(Boolean);
    }
    return getDigitalFormats(product);
  }, [metadata?.specs, product]);
  const licenses = useMemo(() => getDigitalLicenses(product), [product]);
  const compatibility = useMemo(() => {
    const seededCompatibility = metadata?.specs?.software_compatibility;
    if (Array.isArray(seededCompatibility)) {
      return seededCompatibility.map((value) => String(value).trim()).filter(Boolean);
    }
    return getDigitalCompatibility(product);
  }, [metadata?.specs, product]);
  const [selectedLicenseId, setSelectedLicenseId] = useState(licenses[0]?.id ?? "personal");
  const selectedLicense = licenses.find((license) => license.id === selectedLicenseId) ?? licenses[0];
  const rating = reviewStats?.average ?? 4.9;
  const reviewCount = reviewStats?.count ?? 0;
  const fileSize = typeof metadata?.specs?.file_size === "string" && metadata.specs.file_size.trim()
    ? metadata.specs.file_size.trim()
    : getDigitalFileSize(product);
  const includedFiles = typeof metadata?.specs?.included_files === "number"
    ? metadata.specs.included_files
    : getIncludedFileCount(product);
  const isOnSale = typeof product.originalPrice === "number" && product.originalPrice > product.price;
  const url = productUrl(product.id, product.name, currentStore?.slug);

  return (
    <ProductCardShell>
      <ProductCardMedia
        src={product.image}
        fallbackSrc={metadata?.imageUrl ?? metadata?.imageUrls?.[0] ?? null}
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <Star className="h-3.5 w-3.5 fill-current text-amber-500 shrink-0" />
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
            <span>{reviewCount > 0 ? `(${reviewCount})` : ""}</span>
          </div>
          <FileFormatBadges formats={formats.slice(0, 2)} />
        </div>

        <LicenseSelector
          licenses={licenses}
          value={selectedLicenseId}
          onChange={setSelectedLicenseId}
        />

        <div className="grid gap-1 rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <HardDrive className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{fileSize} • {includedFiles} files</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Download className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{typeof metadata?.specs?.delivery_time === "string" ? metadata.specs.delivery_time : getInstantDownloadInfo(product)}</span>
          </div>
        </div>

        <ProductCardActions>
          <div className="flex items-center justify-between gap-2 w-full pt-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl font-bold text-primary truncate min-w-0">BDT {selectedLicense?.price ?? product.price}</span>
              {isOnSale ? (
                <span className="text-xs text-muted-foreground line-through truncate min-w-0">BDT {product.originalPrice}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => addItem({
                productId: product.id,
                name: product.name,
                price: selectedLicense?.price ?? product.price,
                image: product.image,
                size: encodeDigitalCartVariant({
                  license: selectedLicense?.label || "Personal",
                  formats,
                }),
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
