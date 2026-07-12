import type { CSSProperties } from "react";
import type { StoreTheme } from "@/lib/cms/schema";
import { fallbackThemePackages, getThemePackageById } from "@/lib/theme-packages";

export function getStoreThemeStyle(theme: StoreTheme): CSSProperties {
  const themePackage = getThemePackageById(theme.presetId, fallbackThemePackages);
  const vars = theme.mode === "light" ? themePackage.tokens.light : themePackage.tokens.dark;
  const style: CSSProperties & Record<string, string> = {};

  for (const [key, value] of Object.entries(vars)) {
    style[key] = value;
  }

  if (theme.headingFont) {
    style["--font-heading"] = theme.headingFont;
  }

  if (theme.bodyFont) {
    style["--font-body"] = theme.bodyFont;
  }

  if (theme.borderRadius) {
    style["--radius"] = theme.borderRadius;
  }

  for (const [key, value] of Object.entries(theme.customCssVars)) {
    style[key] = value;
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
};

export function getStoreThemeStyleFromRecord(theme: StoredThemeRecord): CSSProperties {
  const themePackage = getThemePackageById(theme.theme_package_id ?? theme.preset_id, fallbackThemePackages);
  const mode = theme.mode === "light" ? "light" : "dark";
  const resolvedVars = theme.colors ?? theme.resolved_tokens?.[mode] ?? (mode === "light" ? themePackage.tokens.light : themePackage.tokens.dark);
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
