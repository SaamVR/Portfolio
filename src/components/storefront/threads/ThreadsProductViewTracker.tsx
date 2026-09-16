"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/data/products";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";

export function ThreadsProductViewTracker({ product }: { product: Product }) {
  const { trackEvent } = useStorefrontAnalytics();
  const trackedProductRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedProductRef.current === product.id) return;
    trackedProductRef.current = product.id;

    const timeout = window.setTimeout(() => {
      trackEvent({
        eventName: "view_item",
        eventCategory: "commerce",
        productId: product.id,
        value: product.price,
        currencyCode: "BDT",
        metadata: {
          source: "threads_product_detail",
          productName: product.name,
          productCategory: product.category || product.type || null,
        },
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [product.category, product.id, product.name, product.price, product.type, trackEvent]);

  return null;
}
