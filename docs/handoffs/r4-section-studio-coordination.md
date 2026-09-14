# R4 Section Studio Coordination

Frozen R3 base: `449e0f6a45200d33e9863d2034a621a298eb3378`
R3 freeze tag: `storefront-r3-frozen-2026-09-14`
Integration branch: `r4/section-studio`

## Objective
R4 turns the frozen Section Styles system into a merchant-safe Section Studio without reopening storefront foundation work.

Merchants should be able to choose a section style and make a small set of bounded presentation adjustments while content/data truth, template contracts, and responsive safety remain intact.

The existing `StorefrontSectionStyleStudio`, Basic editor, mobile editor, Section Styles registry, and frozen public renderers are starting points. R4 extends and unifies them; it does not replace them with a parallel editor or renderer.

## Single-authority rule
Lane A is the only lane allowed to define or change canonical option keys, schema, persistence, normalization, migrations, registry capability metadata, or compatibility/version rules.

Lanes B and C consume Lane A's contract. They must not invent new option keys or persist ad-hoc presentation fields.

Lane D is read-only QA.
## Lane ownership

### Lane A — Contracts + Integration
Owns:
- `StorePageBlock.variantOptions` contract and validation;
- database persistence/migration and generated Supabase types;
- modern-write / legacy-read normalization;
- canonical per-style option capability definitions;
- option reset/inheritance semantics;
- publisher, backup/restore, preview and persistence round-trips;
- integration branch and release checkpoints.

Lane A must not redesign storefront visuals merely because it owns integration.

### Lane B — Section Studio UX
Owns merchant-facing controls and workflow using Lane A contracts:
- desktop Section Studio UX;
- mobile merchant controls;
- preview/device switching;
- option reset/current/inherited state;
- accessibility, touch targets, save/error feedback.

Do not modify canonical contracts or persistence.
### Lane C — Safe Composition Primitives
Owns shared rendering helpers that translate normalized Lane A options into bounded layout behavior.

Allowed work includes semantic wrappers, class-resolution helpers, and renderer consumption for proven option keys. Preserve existing style IDs and data sources.

Do not add option keys, persistence, schema, merchant CSS, custom breakpoints, or template-specific escape hatches.

### Lane D — Read-only QA / Safety
Audits the exact integrated SHA only. No product-code writes.

Verify persistence round-trip, invalid-state rejection, reset/inheritance, public renderer parity, 360/390/430/768/1440 behavior, accessibility, content truth, and Generic/Fashion/Threads isolation.

## Frozen boundaries
- R2 Section Style IDs and Reset/inheritance semantics remain authoritative.
- R3 Threads visual baseline remains frozen; later design revisions are separate work.
- No arbitrary JSX, HTML, JavaScript, Tailwind/class strings, raw CSS, or merchant-defined breakpoints in `variantOptions`.
- No second registry, second renderer system, or duplicate persistence path.
- Theme continues to own global palette, typography, radius, density, and global section spacing.
- Section Studio options are section-level overrides only and may not mutate catalog/content data.
## Working method
1. Lane A lands the canonical contract first.
2. B and C may inspect and scaffold in parallel but must consume A's committed contract before wiring writes/render behavior.
3. Integration cherry-picks/merges bounded lane checkpoints only after ownership review.
4. Targeted tests run first; full regression runs once near integration closeout unless a failure requires earlier expansion.
5. D audits only stable pushed integration SHAs.

## Required viewports
- 360 × 800
- 390 × 844
- 430 × 932
- 768 × 1024
- 1440 × ~1000

## Completion gate
R4 freezes only when:
- modern persistence round-trips safely;
- unsupported/invalid options fail closed or normalize predictably;
- reset removes explicit overrides and restores inherited/default presentation;
- Basic/mobile/Studio surfaces agree on state;
- renderers consume the same normalized options;
- content IDs, product/category truth, and Section Style IDs remain stable;
- Generic, Fashion, and Threads pass regression checks;
- Lane D reports no P0/P1.
