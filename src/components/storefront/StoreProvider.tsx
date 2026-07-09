"use client";

import type { Store } from "@/lib/cms/schema";
import { StoreContext } from "@/components/storefront/store-context";
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
      <CartProvider storeId={store.id}>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </CartProvider>
    </StoreContext.Provider>
  );
}
