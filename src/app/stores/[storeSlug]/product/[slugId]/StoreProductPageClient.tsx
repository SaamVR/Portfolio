"use client";

import ProductDetail from "@/views/ProductDetail";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import type { Store } from "@/lib/cms/schema";

export default function StoreProductPageClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <ProductDetail explicitStoreId={store.id} explicitStoreSlug={store.slug} />
      </StoreThemeScope>
    </StoreProvider>
  );
}
