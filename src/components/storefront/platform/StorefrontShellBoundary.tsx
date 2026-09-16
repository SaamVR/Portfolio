"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import type { StorefrontTemplateDefinition, StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import type { StorefrontShellId } from "@/lib/cms/storefront-platform/rendering/shell-registry";

type SpecializedShellProps = {
  children: ReactNode;
  embedded?: boolean;
};

const FashionV3Shell = dynamic<SpecializedShellProps>(
  () => import("@/components/storefront/fashion-v3/FashionV3Shell").then((module) => module.FashionV3Shell),
);

const ThreadsShell = dynamic<SpecializedShellProps>(
  () => import("@/components/storefront/threads/ThreadsShell").then((module) => module.ThreadsShell),
);

const specializedShellComponents: Readonly<Partial<Record<StorefrontShellId, ComponentType<SpecializedShellProps>>>> = {
  "fashion-v3": FashionV3Shell,
  "threads-earthy": ThreadsShell,
};

export function StorefrontShellBoundary({
  shellId,
  children,
  embedded,
  templateId,
  template,
}: SpecializedShellProps & {
  shellId: StorefrontShellId;
  templateId: StorefrontTemplateId;
  template: StorefrontTemplateDefinition;
}) {
  const SpecializedShell = specializedShellComponents[shellId];
  if (SpecializedShell) {
    return <SpecializedShell embedded={embedded}>{children}</SpecializedShell>;
  }

  return <StorefrontShell templateId={templateId} template={template} embedded={embedded}>{children}</StorefrontShell>;
}
