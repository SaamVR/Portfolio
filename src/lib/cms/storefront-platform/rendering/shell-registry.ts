import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";

export type StorefrontShellId = "classic-commerce" | "fashion-v3" | "threads-earthy";

export interface StorefrontShellDefinition {
  id: StorefrontShellId;
  label: string;
  specialized: boolean;
}

export const storefrontShellRegistry: Readonly<Record<StorefrontShellId, StorefrontShellDefinition>> = {
  "classic-commerce": { id: "classic-commerce", label: "Classic commerce", specialized: false },
  "fashion-v3": { id: "fashion-v3", label: "Fashion V3", specialized: true },
  "threads-earthy": { id: "threads-earthy", label: "Threads earthy editorial", specialized: true },
};

const shellByRendererKind: Readonly<Record<StorefrontTemplateDefinition["rendererKind"], StorefrontShellId>> = {
  generic: "classic-commerce",
  fashion: "fashion-v3",
  threads: "threads-earthy",
};

export function resolveStorefrontShell(template: Pick<StorefrontTemplateDefinition, "rendererKind">): StorefrontShellDefinition {
  return storefrontShellRegistry[shellByRendererKind[template.rendererKind]];
}
