"use client";

import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { StorefrontShellBoundary } from "@/components/storefront/platform/StorefrontShellBoundary";
import { useOptionalStore } from "@/components/storefront/store-context";
import { resolveStorefrontShell } from "@/lib/cms/storefront-platform/rendering/shell-registry";
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
  const template = getStorefrontTemplateDefinition(templateId);

  // Secondary storefront routes historically used the generic chrome even for
  // Threads. Reuse the existing specialized Threads shell so shopper navigation,
  // footer, cart and responsive behavior remain visually continuous with home.
  // Keep every other template on the existing secondary-page shell in this lane.
  if (templateId === "threads") {
    return (
      <StorefrontShellBoundary
        shellId={resolveStorefrontShell(template).id}
        templateId={templateId}
        template={template}
      >
        {children}
      </StorefrontShellBoundary>
    );
  }

  return (
    <StorefrontShell templateId={templateId} template={template}>
      {children}
    </StorefrontShell>
  );
}
