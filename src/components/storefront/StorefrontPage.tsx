"use client";

import { useState } from "react";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useAuth } from "@/hooks/auth-context";
import { cn } from "@/lib/utils";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StorefrontAdminMode } from "@/components/storefront/StorefrontAdminMode";
import { StorefrontAdminOverlay } from "@/components/storefront/StorefrontAdminOverlay";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import type { Store, StorePage } from "@/lib/cms/schema";

export function StorefrontPage({
  store,
  page,
}: {
  store: Store;
  page: StorePage;
}) {
  const { canManageStore } = useAuth();
  const [adminMode, setAdminMode] = useState(false);
  const blocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const canManageStorefront = canManageStore(store.id);

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <div data-testid="storefront-page" data-store-slug={store.slug}>
          <StorefrontLayout>
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className={cn(
                  "relative",
                  canManageStorefront && adminMode && "ring-1 ring-inset ring-primary/20",
                )}
              >
                {canManageStorefront && adminMode ? (
                  <StorefrontAdminMode pageId={page.id} block={block} index={index} />
                ) : null}
                <StorefrontBlockRenderer block={block} />
              </div>
            ))}
          </StorefrontLayout>
        </div>
        {canManageStorefront ? (
          <StorefrontAdminOverlay
            pageId={page.id}
            pageTitle={page.title}
            adminMode={adminMode}
            onAdminModeChange={setAdminMode}
          />
        ) : null}
      </StoreThemeScope>
    </StoreProvider>
  );
}
