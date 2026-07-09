"use client";

import OrderSuccess from "@/views/OrderSuccess";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import type { Store } from "@/lib/cms/schema";

export default function StoreOrderSuccessClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <OrderSuccess explicitStoreId={store.id} explicitStoreSlug={store.slug} />
    </StoreProvider>
  );
}
