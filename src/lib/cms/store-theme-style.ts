import type { CSSProperties } from "react";
import type { StoreTheme } from "@/lib/cms/schema";
import { fallbackThemePackages, resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";
import { resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";

export function getStoreThemeStyle(
  theme: StoreTheme,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): CSSProperties {
  const { vars } = resolveStoreThemeVars(theme, themePackages);
  const style: CSSProperties & Record<string, string> = { ...vars };

  if (theme.headingFont) {
    style["--font-heading"] = theme.headingFont;
  }

  if (theme.bodyFont) {
    style["--font-body"] = theme.bodyFont;
  }

  if (theme.borderRadius) {
    style["--radius"] = theme.borderRadius;
  }

  return style;
}

type StoredThemeRecord = {
  preset_id?: string | null;
  theme_package_id?: string | null;
  mode?: "light" | "dark" | null;
  colors?: Record<string, string> | null;
  resolved_tokens?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  } | null;
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  } | null;
  components?: {
    borderRadius?: string;
  } | null;
  custom_css?: string | null;
};

export function getStoreThemeStyleFromRecord(theme: StoredThemeRecord): CSSProperties {
  return getStoreThemeStyleFromRecordWithPackages(theme, fallbackThemePackages);
}

export function getStoreThemeStyleFromRecordWithPackages(
  theme: StoredThemeRecord,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): CSSProperties {
  const themePackage = resolveThemePackageById(theme.theme_package_id, themePackages, theme.preset_id);
  const mode = theme.mode === "light" ? "light" : "dark";
  const resolvedVars = {
    ...(theme.resolved_tokens?.[mode] ?? (mode === "light" ? themePackage.tokens.light : themePackage.tokens.dark)),
    ...(theme.colors ?? {}),
  };
  const style: CSSProperties & Record<string, string> = {};

  for (const [key, value] of Object.entries(resolvedVars)) {
    if (typeof value === "string") {
      style[key] = value;
    }
  }

  if (theme.typography?.headingFont) {
    style["--font-heading"] = theme.typography.headingFont;
  }

  if (theme.typography?.bodyFont) {
    style["--font-body"] = theme.typography.bodyFont;
  }

  if (theme.components?.borderRadius) {
    style["--radius"] = theme.components.borderRadius;
  }

  return style;
}
