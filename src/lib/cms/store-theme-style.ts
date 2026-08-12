import type { CSSProperties } from "react";
import { normalizeThemeFontFamily } from "@/lib/font-families";
import type { StoreTheme } from "@/lib/cms/schema";
import { fallbackThemePackages, resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";
import { resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";

const aestheticPresentation: Record<NonNullable<StoreTheme["aesthetic"]>, { shadow: string; tracking: string }> = {
  minimal: { shadow: "0 8px 24px hsl(220 20% 10% / 0.08)", tracking: "-0.025em" },
  glassmorphism: { shadow: "0 20px 55px hsl(var(--primary) / 0.16)", tracking: "-0.02em" },
  fluid: { shadow: "0 16px 40px hsl(var(--primary) / 0.12)", tracking: "-0.03em" },
  brutalist: { shadow: "6px 6px 0 hsl(var(--foreground))", tracking: "0.015em" },
  neumorphism: { shadow: "10px 10px 24px hsl(var(--foreground) / 0.12), -8px -8px 20px hsl(var(--background) / 0.8)", tracking: "-0.02em" },
  editorial: { shadow: "0 18px 45px hsl(30 20% 10% / 0.12)", tracking: "-0.04em" },
  retro: { shadow: "4px 4px 0 hsl(var(--accent))", tracking: "0.01em" },
  artisan: { shadow: "0 14px 34px hsl(24 35% 20% / 0.14)", tracking: "-0.015em" },
  "dark-luxury": { shadow: "0 22px 60px hsl(var(--accent) / 0.14)", tracking: "0.025em" },
  "playful-pop": { shadow: "0 12px 0 hsl(var(--accent) / 0.28)", tracking: "-0.025em" },
};

export function getStoreThemePresentationStyle(theme: StoreTheme): Record<string, string> {
  const radiusScale = Math.max(0, Math.min(1, theme.radiusScale ?? 0.55));
  const densityScale = Math.max(0, Math.min(1, theme.densityScale ?? 0.5));
  const presentation = aestheticPresentation[theme.aesthetic ?? "minimal"];
  const radius = typeof theme.radiusScale === "number"
    ? `${(0.12 + radiusScale * 1.05).toFixed(2)}rem`
    : theme.borderRadius ?? "0.70rem";

  return {
    "--radius": radius,
    "--store-section-space": `${(2.75 + densityScale * 3.25).toFixed(2)}rem`,
    "--store-card-shadow": presentation.shadow,
    "--store-heading-tracking": presentation.tracking,
  };
}

export function getStoreThemeStyle(
  theme: StoreTheme,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): CSSProperties {
  const { vars } = resolveStoreThemeVars(theme, themePackages);
  const style: CSSProperties & Record<string, string> = {
    ...vars,
    ...getStoreThemePresentationStyle(theme),
  };

  if (theme.headingFont) {
    style["--font-heading"] = normalizeThemeFontFamily(theme.headingFont);
  }

  if (theme.bodyFont) {
    style["--font-body"] = normalizeThemeFontFamily(theme.bodyFont);
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
    style["--font-heading"] = normalizeThemeFontFamily(theme.typography.headingFont);
  }

  if (theme.typography?.bodyFont) {
    style["--font-body"] = normalizeThemeFontFamily(theme.typography.bodyFont);
  }

  if (theme.components?.borderRadius) {
    style["--radius"] = theme.components.borderRadius;
  }

  return style;
}
