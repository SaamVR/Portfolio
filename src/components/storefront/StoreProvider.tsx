"use client";

import type { Store } from "@/lib/cms/schema";
import { StoreContext } from "@/components/storefront/store-context";
import { StorefrontAnalyticsProvider } from "@/components/storefront/StorefrontAnalyticsProvider";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";

export function StoreProvider({
  store,
  children,
}: {
  store: Store;
  children: React.ReactNode;
}) {
  return (
    <StoreContext.Provider value={store}>
      <StorefrontAnalyticsProvider store={store}>
        <CartProvider storeId={store.id}>
          <WishlistProvider storeId={store.id}>
            {children}
          </WishlistProvider>
        </CartProvider>
      </StorefrontAnalyticsProvider>
    </StoreContext.Provider>
  );
}
