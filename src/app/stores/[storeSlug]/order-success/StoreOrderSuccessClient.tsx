"use client";

import OrderSuccess from "@/views/OrderSuccess";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import type { Store } from "@/lib/cms/schema";

export default function StoreOrderSuccessClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <OrderSuccess explicitStoreId={store.id} explicitStoreSlug={store.slug} />
      </StoreThemeScope>
    </StoreProvider>
  );
}
