import type { StoreTheme } from "@/lib/cms/schema";
import { DEFAULT_STORE_THEME_DENSITY_SCALE, STORE_SECTION_SPACING_PRESETS } from "@/lib/cms/store-theme-contract";

export type StorefrontSemanticTokenStyle = Record<`--${string}`, string>;

const effectIntensity: Record<"subtle" | "medium" | "bold", number> = {
  subtle: 0.35,
  medium: 0.65,
  bold: 1,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function resolveStorefrontSemanticTokens(theme: StoreTheme): StorefrontSemanticTokenStyle {
  const density = clamp01(theme.densityScale ?? DEFAULT_STORE_THEME_DENSITY_SCALE);
  const sectionSpacing = theme.sectionSpacing ? STORE_SECTION_SPACING_PRESETS[theme.sectionSpacing] : null;
  const intensity = effectIntensity[theme.effects?.intensity ?? "medium"];

  return {
    "--store-surface": "var(--background)",
    "--store-surface-muted": "var(--muted)",
    "--store-surface-inverse": "var(--foreground)",
    "--store-text": "var(--foreground)",
    "--store-text-muted": "var(--muted-foreground)",
    "--store-text-inverse": "var(--background)",
    "--store-brand": "var(--primary)",
    "--store-brand-foreground": "var(--primary-foreground)",
    "--store-accent": "var(--accent)",
    "--store-accent-foreground": "var(--accent-foreground)",
    "--store-border": "var(--border)",
    "--store-radius-card": "var(--radius)",
    "--store-radius-control": "calc(var(--radius) * 0.75)",
    "--store-section-gap-mobile": sectionSpacing?.mobile ?? "0rem",
    "--store-section-gap-desktop": sectionSpacing?.desktop ?? "0rem",
    "--store-card-spacing": `${(0.875 + density * 0.875).toFixed(3)}rem`,
    "--store-elevation-card": "var(--store-card-shadow, 0 8px 24px hsl(var(--foreground) / 0.08))",
    "--store-media-radius": "var(--radius)",
    "--store-decoration-intensity": intensity.toString(),
    "--store-effect-intensity": intensity.toString(),
    "--store-motion-intensity": theme.effects?.hoverEffects === false ? "0" : intensity.toString(),
    "--store-parallax-enabled": theme.effects?.parallax ? "1" : "0",
  };
}
