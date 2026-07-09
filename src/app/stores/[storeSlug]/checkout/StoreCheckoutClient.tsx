"use client";

import Checkout from "@/views/Checkout";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import type { Store } from "@/lib/cms/schema";

export default function StoreCheckoutClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <Checkout explicitStoreId={store.id} explicitStoreSlug={store.slug} />
    </StoreProvider>
  );
}
