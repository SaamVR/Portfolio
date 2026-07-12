import { applyTemplateToPage, cmsPageTemplates, instantiateTemplate } from "@/lib/cms/page-templates";
import type { StorePage } from "@/lib/cms/schema";
import type { StoreBusinessFamily, StoreCatalogMode } from "@/lib/cms/store-blueprints";

export interface CmsPageBlueprint {
  id: string;
  name: string;
  description: string;
  businessFamily: StoreBusinessFamily;
  catalogModes: StoreCatalogMode[];
  page: Omit<StorePage, "id">;
}

const commerceCatalogModes: StoreCatalogMode[] = ["single_product", "multi_product", "menu", "inquiry_only"];

export const cmsPageBlueprints: CmsPageBlueprint[] = cmsPageTemplates.map((template) => ({
  ...template,
  businessFamily: "commerce",
  catalogModes: commerceCatalogModes,
}));

export function instantiatePageBlueprint(blueprintId: string, pageCount: number) {
  return instantiateTemplate(blueprintId, pageCount);
}

export function applyPageBlueprint(page: StorePage, blueprintId: string) {
  return applyTemplateToPage(page, blueprintId);
}
