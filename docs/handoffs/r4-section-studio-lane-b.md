# R4 Section Studio — Lane B Handoff

## Identity

- Lane: **B — Section Studio Merchant UX**
- Repository: `SaamVR/EcomCMS`
- Branch: `r4/section-studio-ux`
- Integration branch: `r4/section-studio`
- Frozen R3: `449e0f6a45200d33e9863d2034a621a298eb3378`
- R4 coordination base: `8db782683a659e97baf4f48b79dd3a1b71314338`
- Required Lane A A1 consumed: `bd4069f7d6eb360a95d24ce85f35164a938e7618`
- Lane A final persistence implementation consumed: `413e9ca9cdd877088c23b4323fb3bfa9125b437c`
- Lane A final handoff state consumed: `7720bb5d40ff7f45d54e68c2be655db7dde2eb71`

Lane B evolved the existing Section Studio surfaces. It did not define option keys, enum values, capability allowlists, persistence shape, compatibility semantics, Section Style IDs, or renderer mappings.

## Merchant workflow delivered

The Section Studio workflow now presents the current Section Style and only the adjustments declared by that style's Lane A `optionCapabilities` metadata.
Supported controls use canonical merchant labels/help plus the selected style's allowed values. The UI does not expose raw keys or arbitrary strings.

State is explicit and separate:
- inherited/default values are labeled **Inherited**;
- merchant overrides are labeled **Override**;
- Reset One removes only that explicit key;
- Reset All removes the full explicit option object while preserving `layoutVariant` and content;
- styles with no capabilities show a safe no-adjustments explanation instead of synthesized controls.

Style changes use Lane A normalization. Existing overrides are normalized against the destination style, unsupported overrides disappear, and section copy/catalog/media props are not rewritten.

Save state is visible as saved, unsaved, saving, or error. Error feedback uses an alert state; non-error status is announced through an `aria-live="polite"` status region.

## Surfaces changed

- `src/views/admin/SectionStylesWorkspace.tsx`
  - promoted the existing Section Styles workspace into the focused Section Studio workflow;
  - desktop/mobile preview switch and bounded preview stage;
  - current versus previewing style state;
  - option draft/save/error workflow;
  - canonical style + option persistence and undo behavior.
- `src/components/admin/StorefrontSectionStyleStudio.tsx`
  - existing Studio now hydrates and saves canonical `variantOptions`;
  - shared option controls are embedded per supported section;
  - style changes call Lane A normalization before draft save;
  - global Studio dirty/save/error state is visible and Reset All remains representable as an empty override state.
- `src/components/storefront/BasicModeEditor.tsx`
  - reuses the same capability-driven controls;
  - style changes normalize the existing option object before updating block metadata.
- `src/components/storefront/editor/MobileMerchantEditorSheet.tsx`
  - compact Section Studio controls live in the Layout tab rather than a desktop inspector squeezed into mobile;
  - existing live-editor save/error state is surfaced in the sheet;
  - style changes use canonical cleanup.
- `src/components/storefront/StorefrontLiveEditor.tsx`
  - forwards existing save error state to the mobile editor.
- `src/components/storefront/editor/section-studio/SectionStudioOptionControls.tsx`
  - one reusable merchant control surface derived from Lane A metadata only.
- `src/components/storefront/editor/section-studio/SectionStudioShells.tsx`
  - reusable preview device switch, option state shell, save status, and preview stage.

No new editor, registry, persistence path, option vocabulary, arbitrary CSS field, merchant breakpoint, or template-specific escape hatch was introduced.
## Desktop and mobile behavior

Desktop keeps the comparison library and selected-style detail/preview together, with a bounded mobile/desktop device switch and no raw configuration fields.

Mobile keeps high-frequency actions in the existing bottom sheet. Section Style choice and supported section adjustments are reachable from Layout, while Preview and Save remain in the fixed action row. Native buttons and semantic segmented controls are used; important interactive targets are at least 44px.

Browser QA used a temporary uncommitted harness rendering the real shared controls plus the real `MobileMerchantEditorSheet`. The harness was removed before closeout.

Required viewport results:
- `360 × 800`: 0px document overflow, 0 clipped controls, 0 visible controls below 44px;
- `390 × 844`: same, plus live **Inherited → Override → Reset → Inherited** interaction passed;
- `430 × 932`: 0px document overflow, 0 clipped controls, 0 visible controls below 44px;
- `768 × 1024`: 0px document overflow and no clipped/undersized visible controls;
- `1440 × 1000`: 0px document overflow and no clipped/undersized visible controls.

Machine-readable evidence: `docs/handoffs/evidence/r4-section-studio-lane-b-browser-qa.json`.
## Validation

Final post-Lane-A-merge focused suite: **28 passed, 0 failed** across five suites.

Coverage includes:
- supported controls only;
- inherited versus explicit state;
- Reset One and Reset All;
- unsupported override cleanup on style change;
- content preservation during style changes/resets;
- unsaved/save/error feedback;
- mobile editor responsive contract;
- keyboard-friendly native controls and `aria-pressed` selection state;
- 44px touch-target contract;
- R2 Section Style reset/inheritance regression coverage;
- Lane A variant option persistence/normalization contracts.

Additional final checks:
- TypeScript typecheck under Node `v24.19.0`: PASS;
- targeted ESLint over Lane B UX files/tests: PASS;
- `git diff --check` and staged diff check: PASS.

## Preview boundary

Lane B intentionally did not invent option-to-renderer visual mappings inside `SectionStylePreview`. The existing schematic preview remains responsible for Section Style/device comparison only.
This avoids a second presentation implementation that could diverge from the public storefront. After Lane C is integrated, public rendering remains the authority for the visual effect of normalized options.

## Dependencies / integration notes

### Lane A

No Lane A implementation blocker remains for Lane B. The final Lane A persistence state is an ancestor of this branch. Integration/deployment must still apply `supabase/migrations/20260914161500_r4_section_studio_variant_options.sql` before production writes to `variant_options` are enabled.

The exact required A1 contract consumed by Lane B remains `bd4069f7d6eb360a95d24ce85f35164a938e7618`.

### Lane C

Lane C has published safe renderer primitives at handoff state `aa25fe8e0ea3516e6876e99d1fee2567f6e370df` (implementation `5168eba93a26117350f86d56a4eef9a37c390c66`). Integration should combine that renderer state with Lane B before final R4 QA so merchant adjustments affect the public renderer through the same normalized contract.

Lane B does not require a second preview-specific mapping from Lane C. Final parity should be verified against the integrated public renderer by Lane D.

## Frozen-boundary audit

Lane B did not redesign Threads, Generic, or Fashion; did not change product/category/content truth; did not change Section Style IDs; and did not author schema, migration, generated Supabase type, canonical option catalog, capability metadata, normalization, or renderer primitive semantics.

No merge into `r4/section-studio` and no production deployment were performed by Lane B.
