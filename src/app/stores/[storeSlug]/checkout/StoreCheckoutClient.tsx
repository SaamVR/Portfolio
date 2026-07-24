"use client";

import Checkout from "@/views/Checkout";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import type { Store } from "@/lib/cms/schema";

export default function StoreCheckoutClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <Checkout explicitStoreId={store.id} explicitStoreSlug={store.slug} />
      </StoreThemeScope>
    </StoreProvider>
  );
}
