import type { SupabaseClient } from "@supabase/supabase-js";
import { applyTemplateToPage, cmsPageTemplates, instantiateTemplate } from "@/lib/cms/page-templates";
import { sanitizeStorePage } from "@/lib/cms/validation";
import type { StorePage } from "@/lib/cms/schema";
import type { Database, Json } from "@/integrations/supabase/types";
import type { StoreBusinessFamily, StoreCatalogMode } from "@/lib/cms/store-blueprints";
import { allStoreCatalogModes } from "@/lib/cms/storefront-compat";

export interface CmsPageBlueprint {
  id: string;
  schemaVersion?: number;
  name: string;
  description: string;
  businessFamily: StoreBusinessFamily;
  catalogModes: StoreCatalogMode[];
  page: Omit<StorePage, "id">;
}

const commerceCatalogModes: StoreCatalogMode[] = [...allStoreCatalogModes];

export const fallbackPageBlueprints: CmsPageBlueprint[] = cmsPageTemplates.map((template) => ({
  ...template,
  schemaVersion: 1,
  businessFamily: "commerce",
  catalogModes: commerceCatalogModes,
}));

type PageBlueprintRow = {
  id: string;
  name: string;
  description: string | null;
  business_family: string | null;
  catalog_modes: Json | null;
  page_payload: Json | null;
  schema_version?: number | null;
  is_active: boolean | null;
};

function isStoreCatalogModes(value: unknown): value is StoreCatalogMode[] {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string" && allStoreCatalogModes.includes(item as StoreCatalogMode));
}

function mergePageBlueprintRow(row: PageBlueprintRow): CmsPageBlueprint {
  const fallback = fallbackPageBlueprints.find((item) => item.id === row.id) ?? fallbackPageBlueprints[0];

  return {
    ...fallback,
    id: row.id,
    name: row.name,
    description: row.description ?? fallback.description,
    businessFamily: (row.business_family as StoreBusinessFamily | null) ?? fallback.businessFamily,
    catalogModes: isStoreCatalogModes(row.catalog_modes) ? row.catalog_modes : fallback.catalogModes,
    page: typeof row.page_payload === "object" && row.page_payload
      ? (row.page_payload as Omit<StorePage, "id">)
      : fallback.page,
    schemaVersion: row.schema_version ?? fallback.schemaVersion ?? 1,
  };
}

export async function loadPageBlueprints(
  client: SupabaseClient<Database>,
): Promise<CmsPageBlueprint[]> {
  const { data, error } = await client
    .from("page_blueprints")
    .select("id, name, description, business_family, catalog_modes, page_payload, is_active, schema_version")
    .order("name");

  if (error || !Array.isArray(data) || data.length === 0) {
    return fallbackPageBlueprints;
  }

  const inactiveIds = new Set(
    data
      .filter((row) => row.is_active === false)
      .map((row) => row.id),
  );
  const mergedRows = data
    .filter((row) => row.is_active !== false)
    .map((row) => mergePageBlueprintRow(row));
  const byId = new Map<string, CmsPageBlueprint>();

  for (const blueprint of mergedRows) {
    byId.set(blueprint.id, blueprint);
  }

  for (const fallback of fallbackPageBlueprints) {
    if (inactiveIds.has(fallback.id) || byId.has(fallback.id)) continue;
    byId.set(fallback.id, fallback);
  }

  return Array.from(byId.values());
}

export function instantiatePageBlueprint(
  blueprintId: string,
  pageCount: number,
  blueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
) {
  const blueprint = blueprints.find((item) => item.id === blueprintId);
  if (!blueprint) {
    return instantiateTemplate(blueprintId, pageCount);
  }

  const source = blueprint.page;
  const safeSlug = source.slug === "/" ? `/page-${pageCount + 1}` : source.slug;
  return {
    ...source,
    id: crypto.randomUUID(),
    slug: safeSlug,
    blocks: source.blocks.map((block, index) => ({
      ...block,
      id: crypto.randomUUID(),
      sortOrder: index,
    })),
  };
}

export function applyPageBlueprint(
  page: StorePage,
  blueprintId: string,
  blueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
) {
  const blueprint = blueprints.find((item) => item.id === blueprintId);
  if (!blueprint) {
    return applyTemplateToPage(page, blueprintId);
  }

  return {
    ...page,
    title: blueprint.page.title,
    seoTitle: blueprint.page.seoTitle,
    seoDescription: blueprint.page.seoDescription,
    blocks: blueprint.page.blocks.map((block, index) => ({
      ...block,
      id: crypto.randomUUID(),
      sortOrder: index,
    })),
  };
}

export function normalizePageBlueprintPayload(payload: unknown): Omit<StorePage, "id"> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Page payload must be an object.");
  }

  const candidate = payload as Partial<Omit<StorePage, "id">> & { blocks?: unknown[] };
  const sanitizedPage = sanitizeStorePage({
    id: "page-blueprint-preview",
    slug: typeof candidate.slug === "string" ? candidate.slug : "/page-1",
    title: typeof candidate.title === "string" ? candidate.title : "Untitled Page",
    seoTitle: typeof candidate.seoTitle === "string" ? candidate.seoTitle : "",
    seoDescription: typeof candidate.seoDescription === "string" ? candidate.seoDescription : "",
    isHomepage: candidate.isHomepage === true,
    blocks: Array.isArray(candidate.blocks) ? candidate.blocks : [],
  });

  if (!sanitizedPage) {
    throw new Error("Page payload must include at least one valid block and valid page metadata.");
  }

  const { id: _ignoredId, ...pageBlueprintPayload } = sanitizedPage;
  return pageBlueprintPayload;
}
