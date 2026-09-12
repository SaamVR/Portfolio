import type { StoreTheme } from "@/lib/cms/schema";
import type { StorefrontSemanticTokenStyle } from "./theme-tokens";

export type StorefrontAestheticEngineId = "flat" | "editorial" | "glass" | "artisan";

export interface StorefrontAestheticProfile {
  id: StorefrontAestheticEngineId;
  tokens: StorefrontSemanticTokenStyle;
}

type ProfileDefinition = {
  surfaceAlpha: number;
  borderAlpha: number;
  blur: string;
  elevation: string;
  cardRadiusScale: number;
  controlRadiusScale: number;
  mediaRadiusScale: number;
  headingTracking: string;
  displayScale: number;
  decorationMultiplier: number;
  motionMultiplier: number;
  overlapOffset: string;
};

const profiles: Readonly<Record<StorefrontAestheticEngineId, ProfileDefinition>> = {
  flat: {
    surfaceAlpha: 1,
    borderAlpha: 0.9,
    blur: "0px",
    elevation: "0 1px 2px hsl(var(--foreground) / 0.08)",
    cardRadiusScale: 1,
    controlRadiusScale: 0.8,
    mediaRadiusScale: 1,
    headingTracking: "-0.02em",
    displayScale: 1,
    decorationMultiplier: 0.3,
    motionMultiplier: 0.55,
    overlapOffset: "0px",
  },
  editorial: {
    surfaceAlpha: 1,
    borderAlpha: 0.72,
    blur: "0px",
    elevation: "0 12px 32px hsl(var(--foreground) / 0.10)",
    cardRadiusScale: 0.45,
    controlRadiusScale: 0.35,
    mediaRadiusScale: 0.35,
    headingTracking: "-0.04em",
    displayScale: 1.08,
    decorationMultiplier: 0.22,
    motionMultiplier: 0.4,
    overlapOffset: "-1.25rem",
  },
  glass: {
    surfaceAlpha: 0.72,
    borderAlpha: 0.42,
    blur: "18px",
    elevation: "0 18px 48px hsl(var(--foreground) / 0.14)",
    cardRadiusScale: 1.15,
    controlRadiusScale: 1,
    mediaRadiusScale: 1.1,
    headingTracking: "-0.025em",
    displayScale: 1.02,
    decorationMultiplier: 0.5,
    motionMultiplier: 0.6,
    overlapOffset: "0px",
  },
  artisan: {
    surfaceAlpha: 0.98,
    borderAlpha: 0.78,
    blur: "0px",
    elevation: "0 14px 34px hsl(var(--foreground) / 0.12)",
    cardRadiusScale: 0.9,
    controlRadiusScale: 0.7,
    mediaRadiusScale: 0.82,
    headingTracking: "-0.015em",
    displayScale: 1.02,
    decorationMultiplier: 0.9,
    motionMultiplier: 0.5,
    overlapOffset: "0px",
  },
};

const engineIdByStoredAesthetic: Partial<Record<NonNullable<StoreTheme["aesthetic"]>, StorefrontAestheticEngineId>> = {
  minimal: "flat",
  editorial: "editorial",
  glassmorphism: "glass",
  artisan: "artisan",
};

const intensityValue: Record<"subtle" | "medium" | "bold", number> = {
  subtle: 0.35,
  medium: 0.65,
  bold: 1,
};

export function resolveStorefrontAesthetic(theme: StoreTheme): StorefrontAestheticProfile {
  const id = engineIdByStoredAesthetic[theme.aesthetic ?? "minimal"] ?? "flat";
  const profile = profiles[id];
  const intensity = intensityValue[theme.effects?.intensity ?? "medium"];
  const motionEnabled = theme.effects?.hoverEffects !== false;

  return {
    id,
    tokens: {
      "--store-surface-alpha": profile.surfaceAlpha.toString(),
      "--store-surface-border-alpha": profile.borderAlpha.toString(),
      "--store-backdrop-blur": profile.blur,
      "--store-elevation-card": profile.elevation,
      "--store-radius-card-scale": profile.cardRadiusScale.toString(),
      "--store-radius-control-scale": profile.controlRadiusScale.toString(),
      "--store-media-radius-scale": profile.mediaRadiusScale.toString(),
      "--store-aesthetic-heading-tracking": profile.headingTracking,
      "--store-type-display-scale": profile.displayScale.toString(),
      "--store-decoration-opacity": Math.min(1, intensity * profile.decorationMultiplier).toFixed(3),
      "--store-motion-duration": motionEnabled ? `${Math.round(180 * intensity * profile.motionMultiplier)}ms` : "0ms",
      "--store-overlap-offset": profile.overlapOffset,
      "--store-parallax-offset": theme.effects?.parallax ? `${Math.round(10 * intensity)}px` : "0px",
    },
  };
}

export function buildStorefrontAestheticCss(scopeSelector: string): string {
  return `
${scopeSelector} [data-store-surface] {
  background-color: hsl(var(--store-surface) / var(--store-surface-alpha));
  color: hsl(var(--store-text));
  border-color: hsl(var(--store-border) / var(--store-surface-border-alpha));
  border-radius: calc(var(--store-radius-card) * var(--store-radius-card-scale));
  box-shadow: var(--store-elevation-card);
  -webkit-backdrop-filter: blur(var(--store-backdrop-blur));
  backdrop-filter: blur(var(--store-backdrop-blur));
}
${scopeSelector} [data-store-surface-tone="muted"] { background-color: hsl(var(--store-surface-muted) / var(--store-surface-alpha)); }
${scopeSelector} [data-store-surface-tone="inverse"] { background-color: hsl(var(--store-surface-inverse)); color: hsl(var(--store-text-inverse)); }
${scopeSelector} [data-store-surface-tone="brand"] { background-color: hsl(var(--store-brand)); color: hsl(var(--store-brand-foreground)); }
${scopeSelector} [data-store-control] {
  border-radius: calc(var(--store-radius-control) * var(--store-radius-control-scale));
  transition-duration: var(--store-motion-duration);
}
${scopeSelector} [data-store-media] { border-radius: calc(var(--store-media-radius) * var(--store-media-radius-scale)); }
${scopeSelector} [data-store-heading] { letter-spacing: var(--store-aesthetic-heading-tracking); }
${scopeSelector} [data-store-display] { font-size: calc(1em * var(--store-type-display-scale)); }
${scopeSelector} [data-store-decoration] { opacity: var(--store-decoration-opacity); }
${scopeSelector} [data-store-motion] { transition-duration: var(--store-motion-duration); }
@media (max-width: 767px) {
  ${scopeSelector}[data-store-aesthetic-engine="glass"] {
    --store-surface-alpha: 0.9;
    --store-backdrop-blur: 6px;
    --store-elevation-card: 0 6px 18px hsl(var(--foreground) / 0.10);
    --store-decoration-opacity: 0.22;
    --store-motion-duration: 70ms;
    --store-parallax-offset: 0px;
  }
  ${scopeSelector}[data-store-aesthetic-engine="editorial"] {
    --store-type-display-scale: 0.96;
    --store-overlap-offset: 0px;
  }
  ${scopeSelector}[data-store-aesthetic-engine="artisan"] {
    --store-decoration-opacity: 0.32;
  }
}
@media (prefers-reduced-motion: reduce) {
  ${scopeSelector} {
    --store-motion-duration: 0ms;
    --store-parallax-offset: 0px;
  }
  ${scopeSelector} *,
  ${scopeSelector} *::before,
  ${scopeSelector} *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`.trim();
}
