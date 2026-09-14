# R2 Lane B — Hero + Category Styles Handoff

Branch: `r2/section-styles-hero-category`
Frozen foundation: `7bd9d89`

## Renderer ownership

This lane adds presentation-only renderers. It does not modify `variants/registry.ts`, persistence, theme hydration, Section Styles routing, or Apply Style semantics.

Hero renderer mapping:
- `split` → Editorial Split
- `poster` → Campaign Poster
- `centered` → Minimal Product Focus
- `full-bleed` → Full Image Story
- `collection-spotlight` → Collection Spotlight
- `editorial` → Magazine / Bold Typography

Category renderer mapping:
- `cards` → Image Cards
- `carousel` → Compact Editorial Rail
- `circular-categories` → Circular Categories
- `collection-tiles` → Collection Tiles
- `masonry` → Masonry
- `compact-list` → Minimal List

## Exact registry additions requested from Lane A

Add these two `catalogVariant(...)` entries to the `category-showcase` group in `src/lib/cms/storefront-platform/variants/registry.ts`:

```ts
catalogVariant({
  id: "circular-categories",
  blockType: "category-showcase",
  label: "Circular categories",
  description: "Compact circular category portraits with direct labels.",
  guidance: "Use for recognizable category imagery and short labels; mobile keeps a three-across scan pattern.",
  rendererKey: "category-showcase/circular-categories",
  responsive: {
    mobile: { layout: "grid", columns: 3, order: "source", overflow: "wrap" },
    tablet: { layout: "grid", columns: 4, order: "source", overflow: "wrap" },
    desktop: { layout: "grid", columns: 6, order: "source", overflow: "wrap" },
  },
  safeFallback: "cards",
  performanceClass: "standard",
  interactionRequirement: "none",
  editor: { group: "commerce", order: 25, preview: "thumbnail" },
}),
catalogVariant({
  id: "collection-tiles",
  blockType: "category-showcase",
  label: "Collection tiles",
  description: "Asymmetric image-led collection tiles with a dominant lead category.",
  guidance: "Use when several category images are available; mobile collapses to a stable two-column tile grid.",
  rendererKey: "category-showcase/collection-tiles",
  responsive: {
    mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" },
    tablet: { layout: "grid", columns: 2, order: "source", overflow: "wrap" },
    desktop: { layout: "grid", columns: 4, order: "source", overflow: "wrap" },
  },
  safeFallback: "cards",
  performanceClass: "media-heavy",
  interactionRequirement: "none",
  requirements: { minItems: 3 },
  editor: { group: "media", order: 35, preview: "thumbnail", badge: "media" },
}),
```

## Registry label updates requested

No ID changes are required for the six existing Hero styles or four existing Category styles. To make Section Styles display the production catalog names, update labels only:

- Hero `split`: `Editorial Split`
- Hero `poster`: `Campaign Poster`
- Hero `centered`: `Minimal Product Focus`
- Hero `full-bleed`: `Full Image Story`
- Hero `collection-spotlight`: `Collection Spotlight`
- Hero `editorial`: `Magazine / Bold Typography`
- Category `cards`: `Image Cards`
- Category `carousel`: `Compact Editorial Rail`
- Category `compact-list`: `Minimal List`

`masonry` already has the desired label.

## Mobile contract

Reviewed for 360 / 390 / 430 px behavior in the renderer contract: CTA stacks before `sm`, hero display type uses fluid clamps, editorial category rail uses viewport-relative snap cards, circular categories remain three-across, and image/tile styles use two-column mobile grids without fixed desktop widths.
