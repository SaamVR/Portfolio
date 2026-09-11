"use client";

import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useLocation } from "@/lib/react-router-dom-shim";
import { getStorefrontTemplateDefinition, resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import styles from "./StorefrontPageExperience.module.css";

function resolvePageKind(pathname: string) {
  if (/\/product\//.test(pathname)) return "product";
  if (/(^|\/)shop\/?$/.test(pathname)) return "shop";
  if (/(^|\/)wishlist\/?$/.test(pathname)) return "wishlist";
  if (/(^|\/)cart\/?$/.test(pathname)) return "cart";
  if (/(^|\/)search\/?$/.test(pathname)) return "search";
  return "content";
}

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const store = useOptionalStore();
  const location = useLocation();
  const storefrontProfile = typeof store?.siteSettings?.storefront_profile === "object" && store?.siteSettings?.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string"
      ? storefrontProfile.template_id
      : store?.slug ?? null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string"
      ? storefrontProfile.product_visibility
      : null,
  });
  const pageKind = resolvePageKind(location.pathname);

  return (
    <StorefrontShell templateId={templateId} template={getStorefrontTemplateDefinition(templateId)}>
      <div
        className={styles.page}
        data-storefront-page-kind={pageKind}
        data-storefront-template={templateId}
      >
        {children}
      </div>
    </StorefrontShell>
  );
}
