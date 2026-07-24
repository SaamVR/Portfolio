import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import type { Store } from "@/lib/cms/schema";
import { resolveStoreBlueprint, type StoreBlueprintDefinition } from "@/lib/cms/store-blueprints";
import { fallbackThemePackages, resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";

export function buildBlueprintPreviewStore(
  blueprintInput: string | StoreBlueprintDefinition,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): Store {
  const blueprint = typeof blueprintInput === "string"
    ? resolveStoreBlueprint(blueprintInput)
    : blueprintInput;
  const themePackage = resolveThemePackageById(blueprint.defaultTheme.themePackageId, themePackages, blueprint.defaultTheme.presetId);

  return {
    id: `preview-${blueprint.id}`,
    name: `${blueprint.shortName} Demo`,
    slug: blueprint.id,
    description: blueprint.storeDescription,
    currencyCode: "BDT",
    locale: "en-BD",
    isPublished: true,
    theme: {
      ...blueprint.defaultTheme,
      presetId: themePackage.presetId,
      themePackageId: themePackage.id,
      mode: blueprint.defaultTheme.mode,
      headingFont: blueprint.defaultTheme.headingFont ?? themePackage.tokens.typography.headingFont,
      bodyFont: blueprint.defaultTheme.bodyFont ?? themePackage.tokens.typography.bodyFont,
      borderRadius: blueprint.defaultTheme.borderRadius ?? themePackage.tokens.components.borderRadius,
      customCssVars: {
        ...(themePackage.tokens[blueprint.defaultTheme.mode] ?? {}),
        ...(blueprint.defaultTheme.customCssVars ?? {}),
      },
      customCss: blueprint.defaultTheme.customCss ?? themePackage.customCss,
    },
    pages: instantiateStorePagesFromBlueprint(blueprint),
    siteSettings: blueprint.defaultSiteSettings,
  };
}
