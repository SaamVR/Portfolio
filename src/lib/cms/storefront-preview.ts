import type { Store } from "@/lib/cms/schema";
import { instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import {
  getStorefrontTemplateSeedDefinition,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { fallbackThemePackages, resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";

export function buildTemplatePreviewStore(
  templateId: StorefrontTemplateId,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): Store {
  const seed = getStorefrontTemplateSeedDefinition(templateId);
  const themePackage = resolveThemePackageById(seed.defaultTheme.themePackageId, themePackages, seed.defaultTheme.presetId);

  return {
    id: `preview-${templateId}`,
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
    pages: instantiateStorePagesFromTemplate(templateId),
    siteSettings: seed.defaultSiteSettings,
  };
}
