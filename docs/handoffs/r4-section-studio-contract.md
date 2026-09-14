# R4 Section Studio v0 Contract

Status: coordination contract for implementation lanes.
Base: frozen R3 `449e0f6a45200d33e9863d2034a621a298eb3378`.

## Existing architecture to preserve
A storefront block already separates `layoutVariant` from content `props`, and R2 Section Styles defines canonical style IDs, compatibility, preview metadata, defaults, Reset/inheritance, and specialized routing.

R4 adds bounded per-section presentation options. It does not redefine style IDs or turn blocks into arbitrary layout trees.

The existing `StorefrontSectionStyleStudio` is an editor surface to evolve, not a new source of truth.

## Canonical storage shape
Add an optional top-level `variantOptions` object to `StorePageBlock` and persist it independently from content props.

The durable database representation should be a nullable JSONB `variant_options` column on `store_page_blocks`.

Absence / `null` / `{}` means: no explicit section-level override; inherit the selected style's normal presentation.

Do not persist an `inherit` string value. Reset removes the relevant key, and Reset All persists `variant_options = null` (or equivalent empty normalized state).
## v0 option vocabulary
The canonical keys are intentionally small and semantic:

- `alignment`: `left | center | right`
- `contentWidth`: `narrow | standard | wide`
- `mediaFit`: `cover | contain`
- `emphasis`: `quiet | balanced | strong`
- `spacing`: `tight | compact | comfortable | airy`
- `mobileBehavior`: `stack | scroll | compact`

A key is legal only when the effective Section Style declares support for it. A style may expose only a subset and may narrow the allowed values.

Merchant controls must not accept arbitrary layout strings or unbounded styling values through this contract.

Theme/global controls remain separate. `spacing` here is an explicit section override and must not rewrite `theme.sectionSpacing`.

Existing focal-point/media-position fields can remain where they are in v0; do not duplicate them into `variantOptions` unless Lane A deliberately migrates them in a later contract revision.
## Effective-state resolution
Resolve presentation in this order:

1. explicit `block.layoutVariant`;
2. otherwise template `presentation.blockLayoutVariants[block.type]`;
3. Section Style definition for that effective variant;
4. style defaults;
5. explicit normalized `block.variantOptions` overrides.

`variantOptions` never changes which style is selected. Style selection stays in `layoutVariant`.

If a style has no declared support for an option key, that key must not affect rendering.

When a merchant changes style, normalize the existing option object against the new style capability set. Unsupported keys are removed rather than silently influencing a different style.

Reset One removes that explicit key. Reset All removes all explicit variant options while preserving content and `layoutVariant`.
## Capability metadata
Each canonical Section Style may declare option capabilities beside its existing lifecycle/compatibility/preview metadata.

Capability metadata should describe:
- supported option keys;
- allowed enum values per key;
- optional style-specific default value;
- merchant-facing label/help text where useful.

There is one canonical option catalog. Renderers and editor surfaces consume it; they do not maintain separate allowlists.

Styles without capability metadata remain valid and simply expose no R4 controls.

Changing the meaning of an existing style ID remains prohibited. If a composition meaning changes materially, create a new style ID under the existing R2 versioning discipline.
## Legacy compatibility: read old, write modern
Existing presentation-like values already stored inside block props remain readable for backward compatibility.

Public rendering should prefer an explicit modern `variantOptions` value when present, then fall back to existing legacy presentation props only at a compatibility boundary.

R4 editor writes must use `variantOptions` for the new v0 controls and must not create new duplicate presentation props.

Do not bulk-migrate merchant rows merely to populate defaults. A legacy row with no modern options must render exactly as it did before R4.

Where an old prop and a modern option overlap, normalization/tests must document precedence explicitly.
## Persistence and round-trip requirements
Lane A must update every authoritative path that copies or serializes blocks, including:
- Supabase generated row types;
- page/block loaders and writers;
- template publishing/bundles;
- preview/store hydration;
- backup/restore and restore-plan validation;
- editor drafts and save controllers;
- any snapshot/clone/duplicate logic.

Unknown option keys or invalid enum values must be rejected or stripped by one canonical normalizer before persistence/rendering. Do not let invalid values flow into class construction.

Persistence tests must prove: write → reload → publish/preview → render preserves supported values, and Reset returns to inherited/default presentation.
## Merchant UX requirements
Section Studio v0 should present:
- current Section Style;
- only controls supported by that style;
- clear inherited/default versus explicit override state;
- Reset per control and Reset All;
- desktop/mobile preview modes;
- save, unsaved, error, and validation feedback;
- touch-safe controls on mobile.

Do not mix content editing and presentation controls into one ambiguous field. Existing content editors remain authoritative for copy, media, products, categories, FAQs, testimonials, and other data.

The UI may explain that some options are unavailable for a style; it must not synthesize unsupported controls.
## Renderer requirements
Lane C translates normalized semantic options into bounded shared composition behavior.

Render helpers should consume the effective style ID plus normalized option values and return deterministic classes/props. No renderer should parse arbitrary merchant strings into layout behavior.

Responsive behavior uses the platform's existing breakpoint policy. `mobileBehavior` selects among approved behaviors; merchants cannot define breakpoints.

A section option may change presentation only. It must not change product/category queries, item identity, pricing, stock, URLs, visibility rules, or content source.

## v0 acceptance
R4 v0 is complete when at least the core reusable Hero, Category Showcase, Featured Products, Promo Banner, and Rich Text/Story styles can expose useful bounded controls where appropriate, while unsupported styles remain safely unchanged.

The goal is not maximum configurability. The goal is a coherent, safe customization layer that can be expanded later without schema churn.
