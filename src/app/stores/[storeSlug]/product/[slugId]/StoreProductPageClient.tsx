"use client";

import ProductDetail from "@/views/ProductDetail";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import type { Store } from "@/lib/cms/schema";

export default function StoreProductPageClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <ProductDetail explicitStoreId={store.id} explicitStoreSlug={store.slug} />
    </StoreProvider>
  );
}
