import type { Store } from "@/lib/cms/schema";
import { applyTemplateDemoContentToPages, buildTemplateCatalogSeedRows } from "@/lib/cms/template-demo-seeds";
import { instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import {
  getStorefrontTemplateSeedDefinition,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { sanitizeStoreBlocks } from "@/lib/cms/validation";
import { fallbackThemePackages, resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";
import { STOREFRONT_TAXONOMY_SETTING_KEY } from "@/lib/storefront-taxonomy-snapshot";

export function buildTemplatePreviewStore(
  templateId: StorefrontTemplateId,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): Store {
  const seed = getStorefrontTemplateSeedDefinition(templateId);
  const previewStoreId = `preview-${templateId}`;
  const catalogSeed = buildTemplateCatalogSeedRows(previewStoreId, templateId);
  const themePackage = resolveThemePackageById(seed.defaultTheme.themePackageId, themePackages, seed.defaultTheme.presetId);
  const pages = applyTemplateDemoContentToPages(
    instantiateStorePagesFromTemplate(templateId),
    templateId,
  ).map((page) => ({
    ...page,
    blocks: sanitizeStoreBlocks(page.blocks),
  }));

  return {
    id: previewStoreId,
    name: `${seed.shortName} Demo`,
    slug: templateId,
    description: seed.storeDescription,
    currencyCode: "BDT",
    locale: "en-BD",
    isPublished: true,
    theme: {
      ...seed.defaultTheme,
      presetId: themePackage.presetId,
      themePackageId: themePackage.id,
      mode: seed.defaultTheme.mode,
      headingFont: seed.defaultTheme.headingFont ?? themePackage.tokens.typography.headingFont,
      bodyFont: seed.defaultTheme.bodyFont ?? themePackage.tokens.typography.bodyFont,
      borderRadius: seed.defaultTheme.borderRadius ?? themePackage.tokens.components.borderRadius,
      customCssVars: {
        ...(themePackage.tokens[seed.defaultTheme.mode] ?? {}),
        ...(seed.defaultTheme.customCssVars ?? {}),
      },
      customCss: seed.defaultTheme.customCss ?? themePackage.customCss,
    },
    pages,
    siteSettings: {
      ...seed.defaultSiteSettings,
      [STOREFRONT_TAXONOMY_SETTING_KEY]: {
        categories: catalogSeed.categoryRows.map((row, index) => ({
          id: String(row.id),
          name: row.name,
          sort_order: typeof row.sort_order === "number" ? row.sort_order : index,
        })),
        types: catalogSeed.productTypeRows.map((row, index) => ({
          id: `${previewStoreId}-type-${index}`,
          name: row.name,
          sort_order: typeof row.sort_order === "number" ? row.sort_order : index,
        })),
      },
    },
  };
}
