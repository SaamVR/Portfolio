export const DEFAULT_STORE_THEME_RADIUS_SCALE = 0.55;
export const DEFAULT_STORE_THEME_DENSITY_SCALE = 0.5;

export const STORE_SECTION_SPACING_VALUES = [
  "tight",
  "compact",
  "comfortable",
  "airy",
] as const;

export type StoreSectionSpacing = (typeof STORE_SECTION_SPACING_VALUES)[number];

export const STORE_SECTION_SPACING_PRESETS: Record<
  StoreSectionSpacing,
  { label: string; mobile: string; desktop: string }
> = {
  tight: { label: "Tight", mobile: "0.75rem", desktop: "1rem" },
  compact: { label: "Compact", mobile: "1rem", desktop: "1.25rem" },
  comfortable: { label: "Comfortable", mobile: "1.5rem", desktop: "2rem" },
  airy: { label: "Airy", mobile: "2rem", desktop: "3rem" },
};

export function parseStoreSectionSpacing(value: unknown): StoreSectionSpacing | undefined {
  return typeof value === "string" && (STORE_SECTION_SPACING_VALUES as readonly string[]).includes(value)
    ? value as StoreSectionSpacing
    : undefined;
}
