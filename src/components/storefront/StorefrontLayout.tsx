"use client";

import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getStorefrontTemplateDefinition, resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const store = useOptionalStore();
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

  return (
    <StorefrontShell templateId={templateId} template={getStorefrontTemplateDefinition(templateId)}>
      {children}
    </StorefrontShell>
  );
}
