"use client";

import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { getStorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <StorefrontShell templateId="fashion" template={getStorefrontTemplateDefinition("fashion")}>
      {children}
    </StorefrontShell>
  );
}
