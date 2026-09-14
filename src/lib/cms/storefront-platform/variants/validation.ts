import type { StorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/contracts";
import { hasSectionStylePreviewFixture } from "@/lib/cms/storefront-platform/variants/preview-fixtures";

/**
 * R2 persists only the stable variant ID on a block. Manifest versions are
 * catalog metadata, not merchant-pinned state. Until per-block version pinning
 * exists, a breaking visual change must ship under a new variant ID.
 */
export const SECTION_STYLE_VERSIONING_POLICY = "new-id-for-breaking-change" as const;

export function validateStorefrontVariantManifest(definition: StorefrontVariantDefinition): string[] {
  const issues: string[] = [];
  if (!definition.id.trim()) issues.push("variant id is required");
  if (!Number.isInteger(definition.version) || definition.version < 1) issues.push("version must be a positive integer");
  if (!definition.previewSpec.fixtureId.trim()) issues.push("preview fixture id is required");
  if (!definition.previewSpec.alt.trim()) issues.push("preview alt text is required");
  if (!hasSectionStylePreviewFixture(definition.previewSpec.fixtureId, definition.blockType)) {
    issues.push(`preview fixture ${definition.previewSpec.fixtureId} is not registered`);
  }
  for (const mode of ["desktop", "mobile"] as const) {
    const target = definition.previewSpec[mode];
    if (target.mode === "asset" && !target.assetUrl?.trim()) {
      issues.push(`${mode} asset preview requires assetUrl`);
    }
  }
  return issues;
}
