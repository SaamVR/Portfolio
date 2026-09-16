import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";

export type StorefrontRendererFamilyId = "generic-commerce" | "editorial-commerce";
export type StorefrontRendererImplementationId = "generic" | "fashion-v3" | "threads-earthy";

export interface StorefrontRendererFamilyDefinition {
  id: StorefrontRendererFamilyId;
  label: string;
  specialized: boolean;
  implementations: readonly StorefrontRendererImplementationId[];
}

export interface StorefrontRendererSelection {
  familyId: StorefrontRendererFamilyId;
  implementationId: StorefrontRendererImplementationId;
}

export const storefrontRendererFamilyRegistry: Readonly<Record<StorefrontRendererFamilyId, StorefrontRendererFamilyDefinition>> = {
  "generic-commerce": {
    id: "generic-commerce",
    label: "Generic commerce",
    specialized: false,
    implementations: ["generic"],
  },
  "editorial-commerce": {
    id: "editorial-commerce",
    label: "Editorial commerce",
    specialized: true,
    implementations: ["fashion-v3", "threads-earthy"],
  },
};

const rendererSelectionByKind: Readonly<Record<StorefrontTemplateDefinition["rendererKind"], StorefrontRendererSelection>> = {
  generic: { familyId: "generic-commerce", implementationId: "generic" },
  fashion: { familyId: "editorial-commerce", implementationId: "fashion-v3" },
  threads: { familyId: "editorial-commerce", implementationId: "threads-earthy" },
};

export function resolveStorefrontRenderer(template: Pick<StorefrontTemplateDefinition, "rendererKind">): StorefrontRendererSelection {
  return rendererSelectionByKind[template.rendererKind];
}
