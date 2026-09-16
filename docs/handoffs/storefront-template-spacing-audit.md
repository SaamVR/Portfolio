# Storefront Template Spacing Audit Backlog

Status: recorded during Threads v2 production work; do not block Threads completion.

## Discovery

The shared storefront CSS currently applies `padding-top` and `padding-bottom` from `--store-section-space` to every `<section>` inside every storefront template. `getStoreThemePresentationStyle()` resolves that token to `2.75rem`–`6rem` per side depending on the merchant "Breathing room" setting; the default is roughly `4.38rem` per side.

Many existing renderers already define their own section padding. A static audit on the current Threads branch found 78 storefront `<section>` declarations and at least 50 with explicit Tailwind `py-*` spacing. Examples include Generic Commerce, Fashion V3, Threads, blog surfaces, product related-content sections, and storefront empty/loading states. This means some templates receive component spacing plus the global section spacing, creating excessive vertical whitespace.

Threads exposed the problem clearly: its compact reference layout was receiving roughly 70px of extra top padding and 70px of extra bottom padding on blocks despite defining its own spacing.

## Follow-up after Threads / template replacements

Audit the final preserved + new template catalog at 390px and desktop. Measure computed section padding and adjacent block gaps. Classify sections as component-owned spacing vs token-owned spacing, then eliminate double application rather than applying one universal large value.

Target density bands for the audit: compact commerce ~12–24px, standard commerce ~24–48px, deliberate editorial breathing room ~40–64px. Hero, full-bleed media, trust strips, rails, and footers should normally own their geometry explicitly.

Do not globally delete the rule without regression checks: a minority of generic or utility surfaces may still depend on it. Validate Generic, preserved legacy templates, Fashion V3, Threads, product/shop pages, mobile editor preview, and 360/390/430/768/1440 widths before the cleanup ships.

This is a bounded UI-density cleanup, not a Storefront Platform architecture rewrite.

## Additional systemic UI findings for next runtime

The spacing investigation exposed several adjacent cross-template issues. Treat these as a bounded storefront UI-system cleanup, not a new architecture program.

1. **Duplicate spacing tokens / split source of truth.** `getStoreThemePresentationStyle()` emits `--store-section-space`, while Platform v1 semantic tokens emit `--store-section-spacing` using the same formula. The global stylesheet consumes only the former; the semantic token is currently not consumed. `--store-card-spacing` is also emitted but has no storefront consumer. Consolidate these before adding editor-facing Section Spacing.
2. **Persistence defaults disagree with rendering defaults.** Rendering defaults to `densityScale=0.5` and `radiusScale=0.55`, but `store-persistence.ts` and backup/restore default missing DB values to `1`. A store with an absent scale can therefore change appearance after save/restore. Normalize defaults and add regression tests.
3. **Aesthetic engine adoption is partial.** Platform v1 emits semantic radius/surface/media/motion/decoration tokens, but `data-store-*` consumers are sparse outside `StorefrontSurface` and Composition. Many legacy storefront components still hard-code borders, radii, shadows, colors and transitions, so changing aesthetics/theme can produce mixed visual systems.
4. **Mobile touch-target drift.** Multiple shopper and editor controls remain 32–40px (`h-8`, `h-9`, `h-10`) despite the 44px mobile baseline. Confirmed examples include Fashion V3 wishlist/search/color/quantity controls, several generic/business product-card CTAs, product quantity controls, Threads filter chips/card controls, and parts of the editor. Normalize interactive mobile targets without forcing desktop controls to 44px.
5. **Content-width drift between routes.** Storefront surfaces use many independent max widths. Threads currently mixes 1120/1160/1280/1320/1440px across PDP/home/header/footer/shop; Fashion commonly uses 1200/1500px; generic surfaces use Tailwind 6xl/7xl/other values. Introduce shared content/wide/gutter tokens so header, homepage, shop, PDP and footer align intentionally.
6. **Typography is too small in several storefronts.** Static audit found 205 explicit font-size references below 11px across 33 storefront/editor files. Threads is the largest offender (down to 5–8px); Fashion V3 also has many 9–10px labels. Preserve visual hierarchy but establish minimum readable body/action sizes and reserve tiny type for nonessential metadata only.
7. **Responsive-image policy is not uniformly consumed.** Eight `SafeStorefrontImage fill` usages lack `sizes`, concentrated in Generic/Fashion V3. Some hero implementations mount separate desktop and mobile images with `priority`, potentially prioritizing both sources. Migrate those to the existing responsive media policy / one responsive source strategy and keep priority to the actual LCP image.
8. **Large fixed/minimum section geometry remains after the global-gap bug is removed.** Fashion V3 and Generic still contain many `py-14`/`md:py-24`, `60–80vh` media sections; Threads editorial currently includes 390–560px hero heights and 300–440px promo/story minimums. Audit these as component-owned geometry rather than solving them with a global token.
9. **Hard-coded visual colors bypass merchant theme tokens.** General Catalog badges, booking/real-estate surfaces, inquiry cards and some other business-specific components contain direct hex/green/slate values. Separate semantic/status colors from brandable presentation colors and replace the latter with semantic theme tokens.
10. **Mobile bottom-surface coordination needs a contract.** Product detail has its own fixed mobile purchase bar; Fashion V3 also mounts a fixed cookie notice; editor/live-editor surfaces and other mobile action bars use separate bottom layers/z-indices. Add a shared safe-area/bottom-offset convention and verify cookie/cart/PDP/editor surfaces do not cover each other.

### Recommended next-runtime order

Wave 1: section-gap contract + editor control; spacing-token consolidation; persistence-default fix; content-width/gutter tokens; mobile touch-target sweep; Threads density regression.

Wave 2: typography minimums; responsive-image cleanup; aesthetic-token adoption/hard-coded color cleanup; bottom-surface coordination; per-template component-geometry audit.

Validation should include 360/390/430/768/1440, home/shop/PDP, Generic + Fashion V3 + Threads + preserved templates, and before/after screenshots/geometry measurements. Keep behavior unchanged unless a UI defect requires it.
