"use client";

import Shop from "@/views/Shop";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import type { Store } from "@/lib/cms/schema";

export default function StoreShopPageClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <Shop explicitStoreId={store.id} />
      </StoreThemeScope>
    </StoreProvider>
  );
}
