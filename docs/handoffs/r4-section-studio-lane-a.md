# R4 Section Studio — Lane A Handoff

## Identity

- **Lane:** A — Section Studio Contracts + Persistence
- **Repository:** `SaamVR/EcomCMS`
- **Frozen R3 SHA:** `449e0f6a45200d33e9863d2034a621a298eb3378`
- **R4 coordination base:** `8db782683a659e97baf4f48b79dd3a1b71314338`
- **Branch:** `r4/section-studio-contracts`
- **Integration branch:** `r4/section-studio`
- **A1 contract SHA:** `bd4069f7d6eb360a95d24ce85f35164a938e7618`
- **Final implementation SHA:** `413e9ca9cdd877088c23b4323fb3bfa9125b437c`
- **Merge/deploy status:** not merged; no production deployment performed by Lane A.

Lane A is the single authority for the R4 Section Studio v0 option vocabulary, validation, capability metadata, persistence, legacy-read compatibility, reset semantics, and round-trip behavior. No Lane B or Lane C protected files were modified.

## Canonical v0 schema

`StorePageBlock` now has optional top-level `variantOptions`. The six frozen keys are unchanged:

- `alignment`: `left | center | right`
- `contentWidth`: `narrow | standard | wide`
- `mediaFit`: `cover | contain`
- `emphasis`: `quiet | balanced | strong`
- `spacing`: `tight | compact | comfortable | airy`
- `mobileBehavior`: `stack | scroll | compact`

Unknown keys and invalid values are removed by the canonical normalizer. `null`, `undefined`, and `{}` all mean inherited/default presentation.

## Database and migration

Migration: `supabase/migrations/20260914161500_r4_section_studio_variant_options.sql`.

It adds nullable JSONB `store_page_blocks.variant_options` with an object-or-null check constraint, updates generated Supabase Row/Insert/Update types, and extends the existing transactional backup restore function so `variant_options` is restored atomically with the rest of each block.

R4 does not bulk-populate defaults or rewrite legacy merchant rows. Modern saves persist explicit supported overrides only; inherited/default state persists as `NULL`.

## Capability metadata

The existing canonical Section Style registry was extended with optional `optionCapabilities`; no second registry was created. A capability declares the supported canonical key, narrowed allowed values, optional style default, and can inherit catalog label/help metadata.

Useful v0 declarations exist for the requested core section families:

- Hero: `split`, `centered`
- Category Showcase: `cards`, `carousel`
- Featured Products: `carousel`, `3-col`, `4-col`, `editorial-grid`, `center-focus-rail`
- Promo Banner: `standard`, `image-campaign-banner`, `campaign-cta`
- Rich Text / Story: `standard`, `brand-story`, `split-brand-story`, `minimal-story`

Styles without capability metadata remain valid and expose no R4 options.

## Resolution and compatibility precedence

Effective style resolution remains R2-compatible: explicit `layoutVariant` → template default when absent → canonical Section Style definition. R4 then resolves style defaults plus normalized explicit options.

Legacy presentation-like props are read only at the compatibility boundary. Current mappings are `props.mediaFit`, `props.textAlignment` / `props.align`, and `props.paddingSize` to their matching canonical option semantics.

Modern explicit `variantOptions` wins over supported legacy props. R4 helpers do not write duplicate legacy presentation props.

When a style changes, explicit options are normalized against the destination style and unsupported keys are removed. This applies to Section Styles, central block metadata updates, layout preset changes, and persistence. Resetting to a template with no inherited Section Style also clears stale explicit options.

## Reset / inheritance contract

- Reset One removes only the selected explicit option key.
- Reset All clears `variantOptions` entirely.
- Option resets do **not** change `layoutVariant`.
- Style reset remains R2 behavior: persist `layout_variant = null` and inherit the template default when one exists.
- If no template default exists, no fabricated Reset target is introduced.
- A style with no capability metadata has no R4 controls and no R4 option effect.

Canonical helpers for B/C/integration include:

- `normalizeCanonicalVariantOptions`
- `normalizeVariantOptionsForDefinition`
- `getVariantOptionDefaults`
- `getEffectiveVariantDefinition`
- `getExplicitVariantOptions`
- `getEffectiveVariantOptions`
- `applyVariantAwareBlockPatch`
- `resetVariantOption`
- `resetAllVariantOptions`
- `buildVariantOptionsPersistencePatch`

## Persistence and round-trip surfaces covered

Lane A updated the authoritative block paths for main save/write, public storefront resolution, preview/editor hydration, editor command save/import/revision flows, R2 Section Styles persistence, layout presets, Site Settings snapshots, marketplace template publishing, template preview personalization, backup/restore normalization, restore-plan validation, revision snapshots, and transactional atomic restore.

Primary persistence files include:

- `src/lib/cms/schema.ts`
- `src/lib/cms/store-persistence.ts`
- `src/lib/cms/store-resolver.ts`
- `src/lib/cms/editor-data-controller.ts`
- `src/lib/cms/editor-command-controller.ts` consumers via schema-preserving sanitize/import paths
- `src/integrations/supabase/types.ts`
- `src/lib/cms/template-publisher.ts`
- `src/lib/cms/template-gallery-preview.ts` behavior verified through preservation tests
- `src/lib/store-backup-restore.ts`
- `src/lib/store-backup-restore-plan-validation.ts`
- `src/views/admin/CmsPagesManager.tsx`
- `src/views/admin/SectionStylesWorkspace.tsx`
- `src/views/admin/SiteSettings.tsx`

Block duplication/cloning paths that spread the canonical block object already preserve `variantOptions`; the audit verified those paths did not require duplicate custom serialization logic.

## Validation

Final focused validation against implementation SHA `413e9ca9cdd877088c23b4323fb3bfa9125b437c`:

- focused Lane A test matrix: **68/68 PASS**
- `npm run typecheck` under Node `v24.19.0`: **PASS**
- targeted ESLint over changed TypeScript/TSX files: **PASS, 0 errors**
- generated Supabase types are repository-ignored by ESLint as expected
- `git diff --check`: **PASS**
- protected ownership audit: **PASS** — no `StorefrontSectionStyleStudio.tsx`, `src/components/storefront/editor/**`, or `src/components/storefront/section-styles/**` modifications

Focused tests cover schema normalization, capability enforcement, style-change stripping, reset semantics, legacy precedence, persistence/reset round-trip, public resolver hydration, editor save/import, preset style changes, marketplace publisher preservation, preview preservation, backup/restore, restore-plan rejection, and atomic restore migration coverage.

## Dependency instructions — Lane B

Lane B should consume A1/final contracts rather than defining keys or allowlists.

For `StorefrontSectionStyleStudio.tsx` and mobile merchant controls:

1. load `variant_options` with the block row;
2. hydrate it as `block.variantOptions` and let the schema/canonical normalizer fail closed;
3. determine controls from the effective Section Style `optionCapabilities` only;
4. use `getEffectiveVariantOptions` for effective/default display and explicit `block.variantOptions` to distinguish inherited/default from merchant override;
5. write only `variant_options` for R4 controls;
6. use `resetVariantOption` and `resetAllVariantOptions` for Reset One / Reset All;
7. when changing style, use `applySectionStyleToBlock` / `buildSectionStylePersistencePatch` or equivalent canonical helpers so unsupported options are stripped;
8. do not synthesize controls for styles with no capabilities.

Lane B must preserve `layoutVariant` when resetting options. The existing R2 style Reset remains separate from R4 option Reset.

## Dependency instructions — Lane C

Lane C renderers/composition primitives should consume `getEffectiveVariantOptions(templateId, block)` rather than reading arbitrary raw merchant values. This function applies style defaults, supported legacy fallback, modern explicit precedence, and capability filtering.

Map only the six semantic options to bounded shared behavior. Do not parse raw CSS/classes, do not add option keys, do not create template-specific escape hatches, and do not change product/category/content data sources based on presentation options.

Unsupported styles or unsupported keys must render exactly as before R4.

## Remaining blockers / integration notes

Lane A has no remaining implementation P0/P1 blocker. The database migration must be applied by the normal integration/deployment path before code that writes `variant_options` reaches production.

Lane B still owns the merchant-facing Section Studio/mobile wiring, and Lane C still owns the renderer/composition consumption. Lane A intentionally did not modify those protected implementation surfaces.

Integration should cherry-pick/merge A1 or, preferably, the final implementation SHA before wiring B/C. No merge into `r4/section-studio` and no production deployment were performed by Lane A.
