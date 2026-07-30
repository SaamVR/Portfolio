import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { WishlistContext } from "@/context/wishlist-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

function readWishlist(storageKey: string) {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export const WishlistProvider: React.FC<{ children: React.ReactNode; storeId?: string | null }> = ({ children, storeId }) => {
  const { trackEvent } = useStorefrontAnalytics();
  const storageKey = useMemo(
    () => getScopedStorefrontStorageKey("wishlist", storeId),
    [storeId],
  );
  const [items, setItems] = useState<string[]>(() => (typeof window === "undefined" ? [] : readWishlist(storageKey)));

  useEffect(() => {
    setItems(readWishlist(storageKey));
  }, [storageKey]);

  const persist = (newItems: string[]) => {
    setItems(newItems);
    localStorage.setItem(storageKey, JSON.stringify(newItems));
  };

  const addItem = useCallback((productId: string) => {
    setItems((prev) => {
      if (prev.includes(productId)) return prev;
      const next = [...prev, productId];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    trackEvent({
      eventName: "add_to_wishlist",
      eventCategory: "engagement",
      productId,
      metadata: { storeId },
    });
  }, [storageKey, storeId, trackEvent]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((id) => id !== productId);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    trackEvent({
      eventName: "remove_from_wishlist",
      eventCategory: "engagement",
      productId,
      metadata: { storeId },
    });
  }, [storageKey, storeId, trackEvent]);

  const toggleItem = useCallback((productId: string) => {
    const removing = items.includes(productId);
    setItems((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    trackEvent({
      eventName: removing ? "remove_from_wishlist" : "add_to_wishlist",
      eventCategory: "engagement",
      productId,
      metadata: { storeId },
    });
  }, [items, storageKey, storeId, trackEvent]);

  const isInWishlist = useCallback((productId: string) => items.includes(productId), [items]);

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, toggleItem, isInWishlist, totalItems: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
};

