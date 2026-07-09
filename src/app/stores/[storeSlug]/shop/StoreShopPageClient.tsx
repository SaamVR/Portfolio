"use client";

import Shop from "@/views/Shop";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import type { Store } from "@/lib/cms/schema";

export default function StoreShopPageClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <Shop explicitStoreId={store.id} />
    </StoreProvider>
  );
}
