# R4 Section Studio — Lane C Handoff

## Scope and exact state

- Repository: `SaamVR/EcomCMS`
- Lane: **R4 Lane C — Safe Section Composition Primitives**
- Branch: `r4/section-studio-primitives`
- Integration branch: `r4/section-studio`
- Frozen R3: `449e0f6a45200d33e9863d2034a621a298eb3378`
- R4 coordination base: `8db782683a659e97baf4f48b79dd3a1b71314338`
- Lane A A1 consumed: `bd4069f7d6eb360a95d24ce85f35164a938e7618`
- Lane C implementation commit: `5168eba93a26117350f86d56a4eef9a37c390c66`
- Exact implementation/dependency state: `007937156d0cd646cc850e06e4cc243896a7791e`

A1 was initially consumed as a patch-equivalent cherry-pick while Lane A was publishing. Before closeout, the exact A1 commit was added as a content-neutral merge parent. The tree hash before and after that merge was identical, and `bd4069f7...` is now an actual ancestor of Lane C.

## Shared presentation primitives

Added `src/components/storefront/section-styles/section-option-primitives.ts` with bounded, static mappings only:

- `resolveSectionAlignment(...)`
- `resolveSectionWidth(...)`
- `resolveSectionSpacing(...)`
- `resolveSectionMediaFit(...)`
- `resolveSectionEmphasis(...)`
- `resolveSectionMobileBehavior(...)`
- `resolveSectionOptionClasses(...)`

The primitive layer imports Lane A's canonical `StorefrontVariantOptions` type. It does not define option keys, option values, capabilities, normalization, legacy parsing, schema, persistence, or a renderer registry. All class outputs are fixed code-owned choices; there is no arbitrary class or breakpoint parsing.

## A1 consumption boundary

`StorefrontBlockRenderer` obtains merchant overrides through Lane A's `getExplicitVariantOptions(template.id, block)`. This is intentional: explicit normalized options can alter presentation, while absent options emit no new modifiers and therefore preserve the frozen renderer baseline. Unsupported values are stripped by A1 before Lane C sees them.

Existing legacy renderer behavior was not expanded. Lane C added no renderer-specific compatibility parser. A1 remains the authority for canonical normalization and its shared legacy compatibility helpers.

## Styles wired

Only registry styles with A1 `optionCapabilities` can receive effective Lane C presentation modifiers:

- Hero: `split`, `centered`
- Category Showcase: `cards`, `carousel`
- Featured Products: `carousel`, `3-col`, `4-col`, `editorial-grid`, `center-focus-rail`
- Promo Banner: `standard`, `image-campaign-banner`, `campaign-cta`
- Rich Text / Story: `standard`, `brand-story`, `split-brand-story`, `minimal-story`

Other variants continue through their previous rendering behavior because A1 returns no explicit options for unsupported capability combinations.

## Presentation behavior

- `alignment` changes only text/content alignment and bounded flex alignment.
- `contentWidth` selects fixed max-width classes; it does not alter page/theme container settings.
- `mediaFit` selects only `object-cover` or `object-contain` on supported media.
- `emphasis` changes bounded typography weight/opacity only.
- `spacing` applies local section `py-*` classes only; it never writes or rewrites global theme spacing.
- `mobileBehavior` chooses only approved `stack`, `scroll`, or `compact` compositions using existing Tailwind breakpoints.

No merchant-defined media queries or breakpoint values are accepted. Product/category queries, IDs, prices, stock, URLs, visibility, and content copy remain outside the option layer.

## Responsive evidence

Local template preview browser checks were run for `general-catalog`, `fashion`, and `threads` at exactly `360`, `390`, `430`, `768`, and `1440` CSS px. All 15 cases reported document scroll width equal to viewport width; no body-level horizontal overflow was detected.

The preview runner used local template seed data and placeholder local Supabase environment values solely so the app could construct its runtime clients. No production data or remote catalog truth was used for these measurements.

## Unchanged-default evidence

- `resolveSectionOptionClasses(undefined)` is tested to return empty presentation modifiers.
- The shared renderer uses A1 `getExplicitVariantOptions(...)`, so A1 style defaults are not re-applied as new classes when `variantOptions` is absent.
- `src/components/storefront/threads/**` and `src/components/storefront/fashion-v3/**` have no source diff versus frozen R3.
- Browser preview checks for General Catalog, Fashion, and Threads passed at all required widths with no explicit R4 options.

## Validation

Focused Node/TSX suite: **47 passed, 0 failed**. Coverage includes:

- A1 canonical validation and capability filtering;
- unsupported-option stripping on style changes;
- reset and legacy-precedence semantics;
- R2 Section Styles reset/inheritance behavior;
- specialized Threads routing and declared defaults;
- deterministic option-to-presentation resolution;
- no-op behavior when options are absent;
- approved mobile behavior mappings;
- product/category content-source invariance;
- template preview seed/routing regression coverage.

Additional checks:

- `npm run typecheck` — PASS
- targeted ESLint for all Lane C changed renderer/primitives/tests — PASS
- `git diff --check` — PASS
- browser overflow matrix — 15/15 PASS

## Dependencies and integration

No implementation blocker remains. Lane C requires Lane A A1 `bd4069f7d6eb360a95d24ce85f35164a938e7618` (or an integration state containing that exact contract) before the Lane C implementation is applied.

Lane C did **not** merge into `r4/section-studio`. Integration should preserve Lane A as canonical contract authority and then consume the Lane C presentation commit/state above. No R2/R3 registry semantics, persistence semantics, specialized renderer ownership, or template-specific override system was introduced here.
