"use client";

import ContextAwareShopPage from "@/components/storefront/shop/ContextAwareShopPage";
import { FashionV3ShopPage } from "@/components/storefront/fashion-v3/FashionV3ShopPage";
import { ThreadsShopPage } from "@/components/storefront/threads/ThreadsShopPage";
import { useOptionalStore } from "@/components/storefront/store-context";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

interface ShopProps { explicitStoreId?: string; }

const Shop = ({ explicitStoreId }: ShopProps = {}) => {
  const store = useOptionalStore();
  const profile = typeof store?.siteSettings?.storefront_profile === "object" && store.siteSettings.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(profile?.template_id, {
    templateSeedId: typeof profile?.template_id === "string" ? profile.template_id : null,
    productVisibility: typeof profile?.product_visibility === "string" ? profile.product_visibility : null,
  });

  if (templateId === "threads") {
    return <ThreadsShopPage explicitStoreId={explicitStoreId} />;
  }

  return templateId === "fashion"
    ? <FashionV3ShopPage explicitStoreId={explicitStoreId} />
    : <ContextAwareShopPage explicitStoreId={explicitStoreId} />;
};

export default Shop;