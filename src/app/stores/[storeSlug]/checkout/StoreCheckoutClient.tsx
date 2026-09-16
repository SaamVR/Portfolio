"use client";

import Checkout from "@/views/Checkout";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useCart } from "@/context/useCart";
import type { Store } from "@/lib/cms/schema";

function HydratedStoreCheckout({ store }: { store: Store }) {
  const { isCartReady } = useCart();

  if (!isCartReady) {
    return (
      <StorefrontLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">Loading checkout...</p>
        </div>
      </StorefrontLayout>
    );
  }

  return <Checkout explicitStoreId={store.id} explicitStoreSlug={store.slug} />;
}

export default function StoreCheckoutClient({ store }: { store: Store }) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <HydratedStoreCheckout store={store} />
      </StoreThemeScope>
    </StoreProvider>
  );
}