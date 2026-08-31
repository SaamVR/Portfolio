export const STOREFRONT_TAXONOMY_SETTING_KEY = "storefront_taxonomy";

export type StorefrontTaxonomyEntry = {
  id: string;
  name: string;
  sort_order: number;
};

export type StorefrontTaxonomySnapshot = {
  categories: StorefrontTaxonomyEntry[];
  types: StorefrontTaxonomyEntry[];
};

const EMPTY_TAXONOMY: StorefrontTaxonomySnapshot = {
  categories: [],
  types: [],
};

function normalizeEntries(value: unknown): StorefrontTaxonomyEntry[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!id || !name) return [];

    return [{
      id,
      name,
      sort_order: typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
        ? row.sort_order
        : index,
    }];
  });
}

export function readStorefrontTaxonomySnapshot(
  siteSettings?: Record<string, unknown> | null,
): StorefrontTaxonomySnapshot {
  const value = siteSettings?.[STOREFRONT_TAXONOMY_SETTING_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_TAXONOMY;
  }

  const snapshot = value as Record<string, unknown>;
  return {
    categories: normalizeEntries(snapshot.categories),
    types: normalizeEntries(snapshot.types),
  };
}
