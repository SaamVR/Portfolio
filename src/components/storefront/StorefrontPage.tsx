"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/auth-context";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StorefrontLiveEditor } from "@/components/storefront/StorefrontLiveEditor";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontTemplateRenderer } from "@/components/storefront/StorefrontTemplateRenderer";
import type { Store, StorePage } from "@/lib/cms/schema";
import { useSearchParams } from "@/lib/react-router-dom-shim";

export function StorefrontPage({
  store,
  page,
}: {
  store: Store;
  page: StorePage;
}) {
  const { canManageStore, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [adminMode, setAdminMode] = useState(searchParams.get("admin") === "true");
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
          <StorefrontTemplateRenderer
            store={editableStore}
            page={editablePage}
            blocks={blocks}
            adminMode={adminMode}
            selectedBlockId={selectedBlockId}
            canManageStorefront={canManageStorefront}
            onSelectBlock={setSelectedBlockId}
          />
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
