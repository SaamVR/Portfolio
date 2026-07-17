"use client";

import { useEffect, useMemo, useState } from "react";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useAuth } from "@/hooks/auth-context";
import { cn } from "@/lib/utils";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StorefrontAdminMode } from "@/components/storefront/StorefrontAdminMode";
import { StorefrontLiveEditor } from "@/components/storefront/StorefrontLiveEditor";
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
  const { canManageStore, user } = useAuth();
  const [adminMode, setAdminMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editableStore, setEditableStore] = useState(store);
  const editablePage = useMemo(
    () => editableStore.pages.find((item) => item.id === page.id) ?? page,
    [editableStore.pages, page],
  );
  const blocks = [...editablePage.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const canManageStorefront = canManageStore(editableStore.id);

  useEffect(() => {
    setEditableStore(store);
  }, [store]);

  return (
    <StoreProvider store={editableStore}>
      <StoreThemeScope theme={editableStore.theme}>
        <div data-testid="storefront-page" data-store-slug={editableStore.slug}>
          <StorefrontLayout>
            {blocks.map((block, index) => (
              <div
                key={block.id}
                onClick={() => {
                  if (canManageStorefront && adminMode) {
                    setSelectedBlockId(block.id);
                  }
                }}
                className={cn(
                  "relative transition-shadow",
                  canManageStorefront && adminMode && "cursor-pointer ring-1 ring-inset ring-primary/20 hover:ring-primary/40",
                  selectedBlockId === block.id && "ring-2 ring-primary/50",
                )}
              >
                {canManageStorefront && adminMode ? (
                  <StorefrontAdminMode pageId={editablePage.id} block={block} index={index} />
                ) : null}
                <StorefrontBlockRenderer block={block} />
              </div>
            ))}
          </StorefrontLayout>
        </div>
        {canManageStorefront ? (
          <StorefrontLiveEditor
            store={editableStore}
            page={editablePage}
            setStore={setEditableStore}
            adminMode={adminMode}
            selectedBlockId={selectedBlockId}
            onAdminModeChange={setAdminMode}
            onSelectedBlockChange={setSelectedBlockId}
            canManageStore={canManageStorefront}
            userId={user?.id}
          />
        ) : null}
      </StoreThemeScope>
    </StoreProvider>
  );
}
