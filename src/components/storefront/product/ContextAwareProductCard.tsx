"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import type { Product } from "@/data/products";
import { resolveDefaultProductCartSelection } from "@/lib/commerce/product-cart-selection";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { BeautyProductCard } from "@/components/storefront/beauty/BeautyProductCard";
import { BookingServiceCard } from "@/components/storefront/booking/BookingServiceCard";
import { CraftProductCard } from "@/components/storefront/crafts/CraftProductCard";
import { DigitalProductCard } from "@/components/storefront/digital-downloads/DigitalProductCard";
import { ElectronicsProductCard } from "@/components/storefront/electronics/ElectronicsProductCard";
import { FoodMenuCard } from "@/components/storefront/food/FoodMenuCard";
import { GeneralCatalogProductCard } from "@/components/storefront/general-catalog/GeneralCatalogProductCard";
import { RoomProductCard } from "@/components/storefront/hotel/RoomProductCard";
import { InquiryProductCard } from "@/components/storefront/inquiry/InquiryProductCard";
import { PropertyListingCard } from "@/components/storefront/real-estate/PropertyListingCard";
import { ServiceProductCard } from "@/components/storefront/service/ServiceProductCard";
import { SubscriptionProductCard } from "@/components/storefront/subscriptions/SubscriptionProductCard";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { productUrl, storefrontPath } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { ProductCardVariant } from "@/lib/cms/storefront-product-presentation";
import {
  getDisplayableProductType,
  getPrimaryProductOptionValue,
  getRenderableColorOptions,
  getRenderableMetricOptionGroups,
  getRenderableSizeOptions,
} from "@/lib/cms/storefront-product-presentation";

function formatPrice(product: Product) {
  return `BDT ${product.price.toLocaleString()}`;
}

function getBadge(product: Product) {
  if (product.badge?.trim()) return product.badge.trim();
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  if (product.featured) return "Featured";
  return null;
}

import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

function FashionProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (product: Product) => void;
}) {
  const currentStore = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const badge = getBadge(product);
  const { specs } = useStoreProductPresentation(product);
  const colorOptions = getRenderableColorOptions(product, specs, "fashion");
  const sizeOptions = getRenderableSizeOptions(product, specs, "fashion");
  const metricOptionGroups = getRenderableMetricOptionGroups(product, specs, "fashion");
  const cartSelection = resolveDefaultProductCartSelection(product, getPrimaryProductOptionValue(product, specs, "fashion"));
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const visibleColors = colorOptions.slice(0, 5);
  const remainingColors = colorOptions.length - visibleColors.length;
  const visibleSizes = sizeOptions.slice(0, 4);
  const remainingSizes = sizeOptions.length - visibleSizes.length;
  const visibleMetricGroups = metricOptionGroups.slice(0, 1);

  return (
    <ProductCardShell className="overflow-visible rounded-none border-0 bg-transparent shadow-none hover:translate-y-0 hover:shadow-none">
      <ProductCardMedia
        src={product.image}
        alt={product.name}
        href={url}
        aspect="4/5"
        fit="cover"
        className="bg-muted"
      >
        <ProductCardBadgeLayer
          badge={badge}
          badgeClassName="rounded-none bg-background/95 px-2.5 py-1 text-[9px] tracking-[0.16em] text-foreground shadow-none"
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent className="space-y-2 px-0 pb-1 pt-3">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {getDisplayableProductType(product.category) || getDisplayableProductType(product.type) || "Collection"}
        </p>

        <ProductCardTitle
          href={url}
          className="h-auto min-h-0 text-[0.96rem] font-medium leading-5 sm:text-[1.02rem]"
        >
          {product.name}
        </ProductCardTitle>

        <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
          {visibleColors.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="h-3 w-3 shrink-0 rounded-full border border-black/15 shadow-none"
              style={{ backgroundColor: color.toLowerCase() === "white" ? "#f3f4f6" : color.toLowerCase() }}
              title={color}
            />
          ))}
          {remainingColors > 0 ? (
            <span className="text-[10px] text-muted-foreground">+{remainingColors} colors</span>
          ) : null}

          {visibleSizes.length > 0 ? (
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {visibleSizes.join(" · ")}{remainingSizes > 0 ? ` · +${remainingSizes}` : ""}
            </span>
          ) : null}

          {visibleMetricGroups.map((group) => (
            <span key={group.key} className="text-[10px] text-muted-foreground">
              {group.label}: {group.options[0]}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 items-baseline gap-2 pt-0.5">
          <span className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">{formatPrice(product)}</span>
          {product.originalPrice && product.originalPrice > product.price ? (
            <span className="min-w-0 truncate text-xs text-muted-foreground line-through">BDT {product.originalPrice.toLocaleString()}</span>
          ) : null}
        </div>

        <ProductCardActions className="pt-1">
          <div className="flex w-full items-center gap-2">
            {onQuickView ? (
              <button
                type="button"
                onClick={() => onQuickView(product)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-background text-foreground transition-colors hover:border-foreground/40 hover:bg-muted sm:h-10 sm:w-10"
                aria-label={`Quick view ${product.name}`}
              >
                <Eye className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => addItem({
                productId: product.id,
                name: product.name,
                price: cartSelection?.unitPrice ?? product.price,
                image: product.image,
                size: cartSelection?.label ?? getPrimaryProductOptionValue(product, specs, "fashion"),
                optionIds: cartSelection?.optionIds ?? [],
                fulfillmentType: cartSelection?.fulfillmentType ?? product.fulfillmentType,
                storeId: currentStore?.id,
              })}
              className="inline-flex h-11 min-w-0 flex-1 items-center justify-center border border-foreground bg-foreground px-3 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-primary-foreground sm:h-10"
            >
              Quick Add
            </button>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}

function GenericProductCard({
  product,
}: {
  product: Product;
}) {
  return (
    <GeneralCatalogProductCard product={product} />
  );
}

const productCardRegistry: Record<ProductCardVariant, ({ product, onQuickView }: { product: Product; onQuickView?: (product: Product) => void }) => ReactElement> = {
  generic: ({ product }) => <GenericProductCard product={product} />,
  fashion: ({ product, onQuickView }) => <FashionProductCard product={product} onQuickView={onQuickView} />,
  beauty: ({ product }) => <BeautyProductCard product={product} />,
  electronics: ({ product }) => <ElectronicsProductCard product={product} reviewStats={undefined} />,
  food: ({ product }) => <FoodMenuCard product={product} reviewStats={undefined} />,
  crafts: ({ product }) => <CraftProductCard product={product} reviewStats={undefined} />,
  inquiry: ({ product }) => <InquiryProductCard product={product} reviewStats={undefined} onRequestQuote={() => {}} />,
  service: ({ product }) => <ServiceProductCard product={product} reviewStats={undefined} onBook={() => {}} />,
  booking: ({ product }) => <BookingServiceCard product={product} reviewStats={undefined} onBook={() => {}} />,
  subscription: ({ product }) => <SubscriptionProductCard product={product} reviewStats={undefined} />,
  digital: ({ product }) => <DigitalProductCard product={product} reviewStats={undefined} />,
  hotel_room: ({ product }) => <RoomProductCard product={product} reviewStats={undefined} />,
  property: ({ product }) => <PropertyListingCard product={product} />,
};

export default function ContextAwareProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (product: Product) => void;
}) {
  const currentStore = useOptionalStore();
  const { templateId, cardVariant, metadata } = useStoreProductPresentation(product);
  if (templateId === "threads") {
    return <ThreadsProductCard product={product} onQuickView={onQuickView} />;
  }

  const contactHref = storefrontPath("/contact", currentStore?.slug);
  const reviewStats = undefined;
  const renderers = {
    ...productCardRegistry,
    electronics: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <ElectronicsProductCard product={currentProduct} reviewStats={reviewStats} />,
    food: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <FoodMenuCard product={currentProduct} reviewStats={reviewStats} />,
    crafts: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <CraftProductCard product={currentProduct} reviewStats={reviewStats} />,
    inquiry: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <InquiryProductCard product={currentProduct} reviewStats={reviewStats} onRequestQuote={() => { window.location.href = contactHref; }} />,
    service: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <ServiceProductCard product={currentProduct} reviewStats={reviewStats} onBook={() => { window.location.href = contactHref; }} />,
    booking: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <BookingServiceCard product={currentProduct} reviewStats={reviewStats} onBook={() => { window.location.href = contactHref; }} />,
    subscription: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <SubscriptionProductCard product={currentProduct} reviewStats={reviewStats} metadata={metadata ?? undefined} />,
    digital: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <DigitalProductCard product={currentProduct} reviewStats={reviewStats} metadata={metadata ?? undefined} />,
    hotel_room: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <RoomProductCard product={currentProduct} reviewStats={reviewStats} metadata={metadata ?? undefined} />,
    property: ({ product: currentProduct }: { product: Product; onQuickView?: (product: Product) => void }) => <PropertyListingCard product={currentProduct} metadata={metadata ?? undefined} />,
  } satisfies typeof productCardRegistry;

  const Renderer = renderers[cardVariant] ?? renderers.generic;
  return <Renderer product={product} onQuickView={onQuickView} />;
}