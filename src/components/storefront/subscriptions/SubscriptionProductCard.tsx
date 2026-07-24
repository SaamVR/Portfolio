"use client";

import Link from "next/link";
import { Clock3, Globe2, Laptop2, ShieldCheck, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { productUrl } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { getDisplayableProductType } from "@/lib/cms/storefront-product-presentation";
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

function buildPlanOptions(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]): SubscriptionPlanOption[] {
  const seedPlans = (metadata?.variants ?? [])
    .find((variant) => variant.name.toLowerCase() === "plan")
    ?.values?.map((value) => ({
      id: value.label.toLowerCase().replace(/\s+/g, "-"),
      label: value.label,
      description: "Configured plan option.",
    })) ?? [];

  if (seedPlans.length > 0) return seedPlans;

  const normalizedSizes = product.sizes.map((size) => size.trim()).filter(Boolean);
  const sizePlans = normalizedSizes.slice(0, 4).map((size) => ({
    id: size.toLowerCase().replace(/\s+/g, "-"),
    label: size,
    description: `Configured plan option.`,
  }));

  if (sizePlans.length > 0) return sizePlans;

  const defaults = ["Individual", "Family", "Shared", "Custom"];
  return defaults.slice(0, product.colors.length > 2 ? 4 : 3).map((label) => ({
    id: label.toLowerCase(),
    label,
    description: label === "Custom" ? "Custom tailored access." : `${label} access.`,
  }));
}

function buildDurationOptions(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]): SubscriptionDurationOption[] {
  const seedDurations = (metadata?.variants ?? [])
    .find((variant) => variant.name.toLowerCase() === "duration")
    ?.values?.map((value) => ({
      id: value.label.toLowerCase().replace(/\s+/g, "-") as "monthly" | "yearly",
      label: value.label,
      price: product.price + Math.max(0, Math.round(Number(value.price_delta ?? 0))),
      hint: "Configured duration option",
    })) ?? [];

  if (seedDurations.length > 0) return seedDurations;

  const monthlyPrice = product.price;
  const yearlyPrice = product.originalPrice && product.originalPrice > product.price
    ? product.originalPrice
    : Math.round(product.price * 10);

  return [
    {
      id: "monthly",
      label: "Monthly",
      price: monthlyPrice,
      hint: "Flexible recurring",
    },
    {
      id: "yearly",
      label: "Yearly",
      price: yearlyPrice,
      hint: yearlyPrice < monthlyPrice * 12 ? "Save on annual" : "Longer term",
    },
  ];
}

function deriveDeviceInfo(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  if (typeof metadata?.specs?.supported_devices === "string" && metadata.specs.supported_devices.trim()) {
    return metadata.specs.supported_devices.trim();
  }
  const source = `${product.name} ${product.category} ${product.type} ${product.description}`.toLowerCase();
  if (source.includes("stream") || source.includes("video")) return "Mobile, TV, desktop";
  if (source.includes("design") || source.includes("saas") || source.includes("tool")) return "Web, desktop, tablet";
  return "Web & mobile supported";
}

function deriveActivationInfo(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  if (typeof metadata?.specs?.activation_time === "string" && metadata.specs.activation_time.trim()) {
    return metadata.specs.activation_time.trim();
  }
  if (typeof product.stock === "number" && product.stock > 25) return "Instant delivery";
  if (typeof product.stock === "number" && product.stock > 10) return "Within 30 minutes";
  return "Merchant confirmed";
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
  const planOptions = useMemo(() => buildPlanOptions(product, metadata), [metadata, product]);
  const durationOptions = useMemo(() => buildDurationOptions(product, metadata), [metadata, product]);
  const [selectedPlanId, setSelectedPlanId] = useState(planOptions[0]?.id ?? "individual");
  const [selectedDurationId, setSelectedDurationId] = useState<"monthly" | "yearly">(durationOptions[0]?.id ?? "monthly");
  const selectedPlan = planOptions.find((plan) => plan.id === selectedPlanId) ?? planOptions[0];
  const selectedDuration = durationOptions.find((duration) => duration.id === selectedDurationId) ?? durationOptions[0];
  const rating = reviewStats?.average ?? 4.9;
  const reviewCount = reviewStats?.count ?? 0;
  const url = productUrl(product.id, product.name, currentStore?.slug);

  const variantLabel = `${selectedPlan?.label || "Individual"} • ${selectedDuration?.label || "Monthly"}`;

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

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <Star className="h-3.5 w-3.5 fill-current text-amber-500 shrink-0" />
          <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
          <span>{reviewCount > 0 ? `(${reviewCount})` : ""}</span>
        </div>

        <SubscriptionPlanSelector
          plans={planOptions}
          value={selectedPlanId}
          onChange={setSelectedPlanId}
        />

        <SubscriptionDurationSelector
          durations={durationOptions}
          value={selectedDurationId}
          onChange={setSelectedDurationId}
        />

        <div className="grid gap-1 rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Laptop2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{deriveDeviceInfo(product, metadata)}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{deriveActivationInfo(product, metadata)}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">
            ৳{(selectedDuration?.price ?? product.price).toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">/{selectedDuration?.label.toLowerCase() || "month"}</span>
        </div>

        <ProductCardActions>
          <button
            type="button"
            onClick={() => addItem({
              productId: product.id,
              name: product.name,
              price: selectedDuration?.price ?? product.price,
              image: product.image,
              size: variantLabel,
              storeId: currentStore?.id,
            })}
            className="inline-flex h-10 w-full min-w-0 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Subscribe Now
          </button>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
