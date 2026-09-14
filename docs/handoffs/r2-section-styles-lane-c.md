# R2 Visual Section Library — Lane C handoff

Branch: `r2/section-styles-products-story`
Frozen foundation: `7bd9d89`

## Scope completed

Presentation-only visual styles were added for `featured-products`, `promo-banner`, and `rich-text`.
Existing product sources, content props, schema/persistence, theme architecture, Hero/Category implementation, and Threads-wide layout remain unchanged.

## Renderer keys

- `featured-products/editorial-grid`
- `featured-products/center-focus-rail`
- `featured-products/compact-commerce-grid`
- `featured-products/product-spotlight`
- `featured-products/magazine-rail`
- `featured-products/dense-catalog`
- `promo-banner/image-campaign-banner`
- `promo-banner/dual-promo`
- `promo-banner/campaign-cta`
- `rich-text/split-brand-story`
- `rich-text/editorial-quote`
- `rich-text/minimal-story`

## Lane A registry additions

Add the following entries to `src/lib/cms/storefront-platform/variants/registry.ts`; Lane C intentionally does not edit that authoritative registry.
```ts
catalogVariant({ id: "editorial-grid", blockType: "featured-products", label: "Editorial Grid", description: "Asymmetric product grid with one lead product and supporting collection.", guidance: "Use for image-led assortments where one product should anchor the story.", rendererKey: "featured-products/editorial-grid", responsive: MOBILE_GRID, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 3 }, editor: { group: "commerce", order: 70, preview: "live", badge: "recommended" } }),
catalogVariant({ id: "center-focus-rail", blockType: "featured-products", label: "Center-Focus Rail", description: "Snap-scrolling product rail with a strong centered browsing rhythm.", guidance: "Use for curated collections where touch-first horizontal browsing should preserve vertical space.", rendererKey: "featured-products/center-focus-rail", responsive: MOBILE_CAROUSEL, safeFallback: "carousel", performanceClass: "standard", interactionRequirement: "optional", requirements: { minItems: 2 }, editor: { group: "commerce", order: 80, preview: "live" } }),
catalogVariant({ id: "compact-commerce-grid", blockType: "featured-products", label: "Compact Commerce Grid", description: "Compact multi-column product grid for efficient catalog scanning.", guidance: "Use for commerce-heavy pages where more products should remain visible without crowding mobile.", rendererKey: "featured-products/compact-commerce-grid", responsive: MOBILE_GRID, safeFallback: "4-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 4 }, editor: { group: "commerce", order: 90, preview: "live" } }),
catalogVariant({ id: "product-spotlight", blockType: "featured-products", label: "Product Spotlight", description: "One oversized lead product supported by a smaller product set.", guidance: "Use when a hero product should dominate while preserving access to supporting products.", rendererKey: "featured-products/product-spotlight", responsive: MOBILE_GRID, safeFallback: "2-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 2 }, editor: { group: "commerce", order: 100, preview: "live" } }),
catalogVariant({ id: "magazine-rail", blockType: "featured-products", label: "Magazine Rail", description: "Editorial horizontal rail with staggered product rhythm.", guidance: "Use for fashion, craft, or collection storytelling where browsing should feel less grid-like.", rendererKey: "featured-products/magazine-rail", responsive: MOBILE_CAROUSEL, safeFallback: "carousel", performanceClass: "standard", interactionRequirement: "optional", requirements: { minItems: 2 }, editor: { group: "commerce", order: 110, preview: "live" } }),
catalogVariant({ id: "dense-catalog", blockType: "featured-products", label: "Dense Catalog", description: "High-density catalog grid with restrained card chrome.", guidance: "Use for larger inventories; mobile remains limited to two columns.", rendererKey: "featured-products/dense-catalog", responsive: MOBILE_GRID, safeFallback: "4-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 4 }, editor: { group: "commerce", order: 120, preview: "live" } }),
```
```ts
variant({ id: "image-campaign-banner", blockType: "promo-banner", label: "Image Campaign Banner", description: "Full-width campaign image with overlaid promotional copy and CTA.", guidance: "Use only with strong campaign media and concise copy.", rendererKey: "promo-banner/image-campaign-banner", responsive: MOBILE_STACK, safeFallback: "campaign-cta", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { requiresPrimaryMedia: true, recommendedContentKeys: ["badgeText"] }, editor: { group: "media", order: 30, preview: "live", badge: "media" } }),
variant({ id: "dual-promo", blockType: "promo-banner", label: "Dual Promo", description: "Two coordinated promotional tiles for parallel campaigns or offers.", guidance: "Use when two distinct campaign destinations deserve equal prominence.", rendererKey: "promo-banner/dual-promo", responsive: MOBILE_STACK, safeFallback: "campaign-cta", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { recommendedContentKeys: ["secondaryTitle", "secondaryImageUrl", "secondaryCtaText", "secondaryCtaLink"] }, editor: { group: "media", order: 40, preview: "live" } }),
variant({ id: "campaign-cta", blockType: "promo-banner", label: "Campaign CTA", description: "Typography-led campaign call to action without mandatory media.", guidance: "Use for launches and timely offers when message hierarchy matters more than imagery.", rendererKey: "promo-banner/campaign-cta", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 50, preview: "live", badge: "recommended" } }),

variant({ id: "split-brand-story", blockType: "rich-text", label: "Split Brand Story", description: "Brand narrative paired with a large supporting image.", guidance: "Use for origin, process, founder, or craftsmanship stories with meaningful media.", rendererKey: "rich-text/split-brand-story", responsive: MOBILE_STACK, safeFallback: "minimal-story", performanceClass: "standard", interactionRequirement: "none", requirements: { requiresPrimaryMedia: true, recommendedContentKeys: ["eyebrow"] }, editor: { group: "content", order: 40, preview: "live", badge: "media" } }),
variant({ id: "editorial-quote", blockType: "rich-text", label: "Editorial Quote", description: "Large editorial statement with supporting rich-text narrative.", guidance: "Use when the section has one strong statement or brand principle worth emphasizing.", rendererKey: "rich-text/editorial-quote", responsive: MOBILE_STACK, safeFallback: "minimal-story", performanceClass: "light", interactionRequirement: "none", requirements: { recommendedContentKeys: ["eyebrow"] }, editor: { group: "content", order: 50, preview: "live" } }),
variant({ id: "minimal-story", blockType: "rich-text", label: "Minimal Story", description: "Restrained text-first brand narrative with minimal visual framing.", guidance: "Use as the safest story treatment when no supporting media is available.", rendererKey: "rich-text/minimal-story", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 60, preview: "live", badge: "recommended" } }),
```
## Validation

- `npm run typecheck` — PASS
- targeted ESLint over all Lane C touched/new TypeScript and TSX files — PASS
- 10 targeted tests — PASS, including the new Lane C resolver/presentation contracts, existing Section Style Library tests, and mobile touch-target regression tests
- `git diff --check` — PASS for tracked changes
- ownership/path audit — PASS; no central registry, schema/persistence, theme engine, Hero, Category, or Threads paths changed

## Integration gate / known issue

The 12 new styles are implemented at runtime and in canonical-fixture previews, but they will not be discoverable in the Section Styles library until Lane A applies the registry additions above. This is intentional ownership separation, not a runtime renderer defect.

`center-focus-rail` and `magazine-rail` use native touch/snap horizontal scrolling rather than JavaScript auto-advance. This keeps the styles mobile-first, reduced-motion-safe, and low-cost; arrows/autoplay can be a later enhancement if product requirements demand them.
