"use client";

import Link from "next/link";
import { Clock3, Laptop2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { resolveProductCartSelection } from "@/lib/commerce/product-cart-selection";
import { findCommercialOptionByKind, getActiveCommercialOptions } from "@/lib/commerce/product-commercial-options";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { productUrl } from "@/lib/slug";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";
import {
  getDisplayableProductType,
  type ProductPresentationSpecs,
} from "@/lib/cms/storefront-product-presentation";
import { SubscriptionDurationSelector, type SubscriptionDurationOption } from "@/components/storefront/subscriptions/SubscriptionDurationSelector";
import { SubscriptionPlanSelector, type SubscriptionPlanOption } from "@/components/storefront/subscriptions/SubscriptionPlanSelector";
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

type VariantValue = { label?: string; price_delta?: number };
type VariantGroup = { name?: string; values?: VariantValue[] };

function variantGroups(specs: ProductPresentationSpecs, metadata?: TemplateSeedCatalogMetadata["products"][string]): VariantGroup[] {
  if (Array.isArray(metadata?.variants) && metadata.variants.length > 0) return metadata.variants;
  return Array.isArray(specs.variants) ? specs.variants as VariantGroup[] : [];
}

function buildPlanOptions(
  product: Product,
  specs: ProductPresentationSpecs,
  metadata?: TemplateSeedCatalogMetadata["products"][string],
): SubscriptionPlanOption[] {
  const commercial = getActiveCommercialOptions(product.commercialOptions).filter((option) => option.kind === "plan");
  if (commercial.length > 0) {
    return commercial.map((option) => ({
      id: option.id,
      label: option.label,
      description: "Merchant-configured plan option.",
    }));
  }
  const planGroup = variantGroups(specs, metadata).find((variant) => variant.name?.toLowerCase() === "plan");
  return (planGroup?.values ?? [])
    .map((value) => {
      const label = value.label?.trim();
      if (!label) return null;
      return { id: label.toLowerCase().replace(/\s+/g, "-"), label, description: "Merchant-configured plan option." };
    })
    .filter((value): value is SubscriptionPlanOption => Boolean(value));
}

function buildDurationOptions(
  product: Product,
  specs: ProductPresentationSpecs,
  metadata?: TemplateSeedCatalogMetadata["products"][string],
): SubscriptionDurationOption[] {
  const commercial = getActiveCommercialOptions(product.commercialOptions).filter((option) => option.kind === "duration");
  if (commercial.length > 0) {
    return commercial
      .map((option) => ({
        id: option.id,
        label: option.label,
        price: product.price + option.priceDelta,
        hint: "Merchant-configured duration option",
      }))
      .filter((option) => option.price >= 0);
  }
  const durationGroup = variantGroups(specs, metadata).find((variant) => variant.name?.toLowerCase() === "duration");
  return (durationGroup?.values ?? [])
    .map((value) => {
      const label = value.label?.trim();
      if (!label || typeof value.price_delta !== "number" || !Number.isFinite(value.price_delta)) return null;
      const normalized = label.toLowerCase();
      if (!normalized.includes("month") && !normalized.includes("year")) return null;
      return {
        id: normalized.replace(/\s+/g, "-"),
        label,
        price: Math.max(0, product.price + Math.round(value.price_delta)),
        hint: "Merchant-configured duration option",
      };
    })
    .filter((value): value is SubscriptionDurationOption => Boolean(value));
}

function explicitText(
  product: Product,
  specs: ProductPresentationSpecs,
  metadata: TemplateSeedCatalogMetadata["products"][string] | undefined,
  key: string,
) {
  const seedValue = metadata?.specs?.[key];
  if (typeof seedValue === "string" && seedValue.trim()) return seedValue.trim();
  const value = specs[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  const metricValues = product.metricValues?.[key]?.map((item) => item.trim()).filter(Boolean);
  return metricValues?.join(", ") ?? "";
}

export function SubscriptionProductCard({
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
  const trustedSpecs = useMemo(() => isPreview ? specs : {}, [isPreview, specs]);
  const planOptions = useMemo(() => buildPlanOptions(product, trustedSpecs, trustedMetadata), [product, trustedMetadata, trustedSpecs]);
  const durationOptions = useMemo(() => buildDurationOptions(product, trustedSpecs, trustedMetadata), [product, trustedMetadata, trustedSpecs]);
  const [selectedPlanId, setSelectedPlanId] = useState(planOptions[0]?.id ?? "");
  const [selectedDurationId, setSelectedDurationId] = useState(durationOptions[0]?.id ?? "");
  const selectedPlan = planOptions.find((plan) => plan.id === selectedPlanId) ?? planOptions[0];
  const selectedDuration = durationOptions.find((duration) => duration.id === selectedDurationId) ?? durationOptions[0];
  const rating = reviewStats && reviewStats.count > 0 && Number.isFinite(reviewStats.average) && reviewStats.average > 0
    ? reviewStats.average
    : null;
  const reviewCount = rating !== null ? reviewStats!.count : 0;
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const supportedDevices = explicitText(product, trustedSpecs, trustedMetadata, "supported_devices");
  const activationTime = explicitText(product, trustedSpecs, trustedMetadata, "activation_time");
  const variantLabel = [selectedPlan?.label, selectedDuration?.label].filter(Boolean).join(" • ");
  const selectedPlanCommercial = selectedPlan
    ? findCommercialOptionByKind(product.commercialOptions, "plan", selectedPlan.id)
      ?? findCommercialOptionByKind(product.commercialOptions, "plan", selectedPlan.label)
    : null;
  const selectedDurationCommercial = selectedDuration
    ? findCommercialOptionByKind(product.commercialOptions, "duration", selectedDuration.id)
      ?? findCommercialOptionByKind(product.commercialOptions, "duration", selectedDuration.label)
    : null;
  const cartSelection = product.commercialOptions?.length
    ? resolveProductCartSelection(product, [
        ...(selectedPlanCommercial ? [{ groupKey: selectedPlanCommercial.groupKey, label: selectedPlanCommercial.label }] : []),
        ...(selectedDurationCommercial ? [{ groupKey: selectedDurationCommercial.groupKey, label: selectedDurationCommercial.label }] : []),
      ], variantLabel)
    : null;
  const canSubscribe = Boolean(selectedPlan && selectedDuration && variantLabel);

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
          badge={product.badge || "Subscription"}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary truncate min-w-0">
          {getDisplayableProductType(product.category) || getDisplayableProductType(product.type) || "Subscription"}
        </p>

        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>

        {rating !== null ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0" aria-label={`${rating.toFixed(1)} out of 5 from ${reviewCount} review${reviewCount === 1 ? "" : "s"}`}>
            <Star className="h-3.5 w-3.5 fill-current text-amber-500 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
            <span>({reviewCount})</span>
          </div>
        ) : null}

        {planOptions.length > 0 ? <SubscriptionPlanSelector plans={planOptions} value={selectedPlanId} onChange={setSelectedPlanId} /> : null}
        {durationOptions.length > 0 ? <SubscriptionDurationSelector durations={durationOptions} value={selectedDurationId} onChange={setSelectedDurationId} /> : null}

        {supportedDevices || activationTime ? (
          <div className="grid gap-1 rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
            {supportedDevices ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <Laptop2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{supportedDevices}</span>
              </div>
            ) : null}
            {activationTime ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{activationTime}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedDuration ? (
          <div className="flex items-baseline gap-1.5 pt-1 min-w-0">
            <span className="text-xl font-bold text-primary truncate min-w-0">৳{(cartSelection?.unitPrice ?? selectedDuration.price).toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">/{selectedDuration.label.toLowerCase()}</span>
          </div>
        ) : (
          <p className="pt-1 text-xs leading-5 text-muted-foreground">Subscription pricing is not configured for this item yet.</p>
        )}

        <ProductCardActions>
          {canSubscribe ? (
            <button
              type="button"
              onClick={() => addItem({
                productId: product.id,
                name: product.name,
                price: cartSelection?.unitPrice ?? selectedDuration!.price,
                image: product.image,
                size: cartSelection?.label ?? variantLabel,
                optionIds: cartSelection?.optionIds ?? [],
                fulfillmentType: cartSelection?.fulfillmentType ?? product.fulfillmentType,
                storeId: currentStore?.id,
              })}
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Subscribe Now
            </button>
          ) : (
            <Link
              href={url}
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              View subscription details
            </Link>
          )}
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
