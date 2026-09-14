import { getStorefrontViewportTier } from "@/lib/storefront-platform/mobile/mobile-viewport";

export type StorefrontEffectPolicy = {
  mode: "reduced" | "standard";
  allowContinuousMotion: false;
  allowParallax: boolean;
  allowHoverEffects: boolean;
  allowBackdropFilter: boolean;
  maxBackdropBlurPx: 0 | 4 | 8;
};

export function resolveStorefrontEffectPolicy({
  viewportWidth,
  prefersReducedMotion = false,
  saveData = false,
}: {
  viewportWidth: number;
  prefersReducedMotion?: boolean;
  saveData?: boolean;
}): StorefrontEffectPolicy {
  const tier = getStorefrontViewportTier(viewportWidth);
  const constrained = prefersReducedMotion || saveData || tier === "compact-mobile" || tier === "mobile";

  if (constrained) {
    return { mode: "reduced", allowContinuousMotion: false, allowParallax: false, allowHoverEffects: false,
      allowBackdropFilter: false, maxBackdropBlurPx: 0 };
  }

  const desktop = tier === "desktop";
  return {
    mode: "standard",
    allowContinuousMotion: false,
    allowParallax: desktop,
    allowHoverEffects: true,
    allowBackdropFilter: true,
    maxBackdropBlurPx: desktop ? 8 : 4,
  };
}
