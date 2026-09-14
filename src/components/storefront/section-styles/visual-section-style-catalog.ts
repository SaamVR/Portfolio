export const HERO_VISUAL_STYLES = [
  { id: "split", label: "Editorial Split", mobile: "stack" },
  { id: "poster", label: "Campaign Poster", mobile: "story" },
  { id: "centered", label: "Minimal Product Focus", mobile: "stack" },
  { id: "full-bleed", label: "Full Image Story", mobile: "story" },
  { id: "collection-spotlight", label: "Collection Spotlight", mobile: "stack" },
  { id: "editorial", label: "Magazine / Bold Typography", mobile: "stack" },
] as const;

export const CATEGORY_VISUAL_STYLES = [
  { id: "cards", label: "Image Cards", mobile: "grid" },
  { id: "carousel", label: "Compact Editorial Rail", mobile: "scroll" },
  { id: "circular-categories", label: "Circular Categories", mobile: "grid" },
  { id: "collection-tiles", label: "Collection Tiles", mobile: "grid" },
  { id: "masonry", label: "Masonry", mobile: "columns" },
  { id: "compact-list", label: "Minimal List", mobile: "stack" },
] as const;

export type HeroVisualStyleId = (typeof HERO_VISUAL_STYLES)[number]["id"];
export type CategoryVisualStyleId = (typeof CATEGORY_VISUAL_STYLES)[number]["id"];

const HERO_STYLE_IDS = new Set<string>(HERO_VISUAL_STYLES.map((style) => style.id));
const CATEGORY_STYLE_IDS = new Set<string>(CATEGORY_VISUAL_STYLES.map((style) => style.id));

export const CATEGORY_REGISTRY_ADDITIONS = ["circular-categories", "collection-tiles"] as const;
export const MOBILE_REVIEW_WIDTHS = [360, 390, 430] as const;

export function resolveHeroVisualStyleId(layoutVariant: string | null | undefined): HeroVisualStyleId {
  return HERO_STYLE_IDS.has(layoutVariant ?? "") ? layoutVariant as HeroVisualStyleId : "full-bleed";
}

export function resolveCategoryVisualStyleId(layoutVariant: string | null | undefined): CategoryVisualStyleId {
  return CATEGORY_STYLE_IDS.has(layoutVariant ?? "") ? layoutVariant as CategoryVisualStyleId : "cards";
}
