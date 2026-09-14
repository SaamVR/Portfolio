export const MOBILE_STOREFRONT_VIEWPORTS = [360, 390, 430] as const;
export const MINIMUM_TOUCH_TARGET_PX = 44;
export const PRIMARY_TOUCH_TARGET_PX = 48;

export type StorefrontViewportTier = "compact-mobile" | "mobile" | "tablet" | "desktop";

export function getStorefrontViewportTier(width: number): StorefrontViewportTier {
  if (width <= 430) return "compact-mobile";
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function isPrimaryTouchTargetCompliant(sizePx: number) {
  return Number.isFinite(sizePx) && sizePx >= PRIMARY_TOUCH_TARGET_PX;
}
