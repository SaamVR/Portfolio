# Storefront Platform v1 — Lane A Handoff

## Identity

- **Lane:** A — Composition & Contracts
- **Repository:** `SaamVR/EcomCMS`
- **Frozen BASE_SHA:** `b1ba310bae98ed3145990ff1fd9af4077cf557fe`
- **Branch:** `arch/v1-composition`
- **Integration branch:** `architecture/storefront-platform-v1`
- **Latest implementation SHA at handoff creation:** `4a33682041b4db8ec57fdc243d6d9c245c367fde`
- **Draft integration PR:** #356 — `Storefront Platform v1: Lane A composition contracts`
- **Merge/deploy status:** not merged; no production deployment performed by Lane A.

The branch was created from and still descends from the frozen base. A final compare from the frozen base to the latest implementation SHA showed the branch **8 commits ahead, 0 behind**, with changes confined to Lane A-owned CMS schema/registry and new `storefront-platform/composition/**` and `storefront-platform/variants/**` files.

## Completed Gates

### A1 — Canonical variant registry — COMPLETE

Implemented a typed authoritative registry for reusable visual variants. Each registered variant can carry:

- variant id and block type
- label, description, and guidance
- renderer key
- compatible business families
- required capabilities
- recommendation metadata
- minimum item/media requirements
- mobile/tablet/desktop responsive contract
- safe fallback
- performance classification
- interaction requirement
- editor metadata
- version

`block-registry.ts` now consumes variant IDs from the canonical registry instead of maintaining a duplicate Lane A variant map. Existing storefront renderer behavior was not changed.

Primary commit: `27f3df43ccab13cf822108f685d3e2d7eac27b8b` (`A1 canonical variant registry`).

### A2 — Universal Composition block — COMPLETE

Added one schema-versioned `composition` block backed by a bounded declarative tree. The contract contains **no arbitrary JavaScript, eval, arbitrary imports, or arbitrary CSS properties**.

Initial primitive vocabulary:

- section / container
- stack / row / grid / columns
- surface / card / panel
- heading / text / rich-text
- badge / divider
- image / media
- CTA group
- decorative layer
- data slot

Initial v1 complexity limits are intentionally conservative and documented in code:

- maximum depth: **6**
- maximum nodes: **64**
- maximum children per general node: **12**, with tighter primitive-specific caps
- maximum text length: **4000**
- maximum rich-text paragraphs: **24**
- maximum CTA actions: **3**
- maximum data-slot items: **24**

The `24` item ceiling follows existing CMS data-heavy block limits. `64` total nodes gives enough room for semantic wrappers and repeated templates while preventing the composition document from becoming an unbounded DOM/config language.

Validation covers root primitive, allowed primitive IDs, strict primitive props, depth/node/child caps, duplicate node IDs, safe URLs, data-slot references, binding fields, and explicit schema version.

Primary commits:

- `45caae77913718933dabe3255c4234fb3b2cf90f` — composition schema/primitives
- `42c3d172ec6b28814292e110a6266ed5951c2f36` — CMS schema wiring
- `8d53ee132c69ad7cd529d690076453d5a847da6a` — block-registry registration
- `4a33682041b4db8ec57fdc243d6d9c245c367fde` — type-safe default composition block fix found by preview build

### A3 — Composition recipes — COMPLETE

Recipes are data presets over the same `composition` document schema, not separate backend block types or renderer code.

Proof recipes:

1. **Editorial story** — large media + story panel + badge + CTA + decorative layer.
2. **Modern promotion** — asymmetric 2:1 composition + campaign media + offer surface + multiple CTAs + accent decoration.

A lightweight `basic-content` recipe was added as the universal no-media safe fallback. All checked-in recipes are parsed against the canonical composition document schema during module initialization.

Primary commit: `2af104b270d4c84e995c7bbeeaf358f0cfef9b50` (`A3 composition recipes`), with fallback metadata finalized in A5.

### A4 — Data-slot contracts — COMPLETE

Defined normalized, safe data slots without implementing storefront fetching or caching:

- `products`
- `featured-products`
- `categories`
- `content`
- `testimonials`
- `faq`

Each slot contract defines allowed source modes, maximum items, exposed binding fields, required capabilities, empty behavior, and version. Dynamic payload validation rejects undeclared fields, unsafe link protocols, unsafe image URLs, unsupported value types, out-of-range ratings, and overlong strings.

Adapters translate existing CMS blocks into normalized `CompositionDataSlotRequest` objects and can collect authored composition data-slot requests. These adapters perform **zero network/data fetching**.

Primary commit: `cd3959c3b92e68d7f0928c3a9850a396cceeea82` (`A4 data-slot contracts`).

### A5 — Compatibility / responsive contracts — COMPLETE

Every registered reusable variant and recipe carries:

- requirements
- safe fallback
- mobile behavior
- tablet behavior
- desktop behavior
- interaction requirement
- performance class

Compatibility resolution evaluates business family, capabilities, item/media requirements, and primary-media availability, then follows bounded fallback chains.

Mobile is canonical. The contract validator rejects `preserve` as a mobile layout and rejects more than two declared mobile columns; desktop remains an enhancement breakpoint.

Primary commit: `2d104c6ec28ade2e2eecfabaf650809aa36db8d6` (`A5 responsive compatibility contracts`).

## Exact Files Changed

Modified Lane A-owned files:

- `src/lib/cms/block-registry.ts`
- `src/lib/cms/block-registry.test.ts`
- `src/lib/cms/schema.ts`
- `src/lib/cms/schema.test.ts`

Added Lane A files:

- `src/lib/cms/storefront-platform/composition/contracts.ts`
- `src/lib/cms/storefront-platform/composition/defaults.ts`
- `src/lib/cms/storefront-platform/composition/primitives.ts`
- `src/lib/cms/storefront-platform/composition/schema.ts`
- `src/lib/cms/storefront-platform/composition/schema.test.ts`
- `src/lib/cms/storefront-platform/composition/recipes.ts`
- `src/lib/cms/storefront-platform/composition/recipes.test.ts`
- `src/lib/cms/storefront-platform/composition/data-slot-contracts.ts`
- `src/lib/cms/storefront-platform/composition/data-slot-contracts.test.ts`
- `src/lib/cms/storefront-platform/composition/data-slot-adapters.ts`
- `src/lib/cms/storefront-platform/variants/contracts.ts`
- `src/lib/cms/storefront-platform/variants/registry.ts`
- `src/lib/cms/storefront-platform/variants/registry.test.ts`
- `src/lib/cms/storefront-platform/variants/compatibility.ts`
- `src/lib/cms/storefront-platform/variants/compatibility.test.ts`

This handoff document is the only additional file created after the implementation diff audit.

## Validation / Test Results

### Static ownership and branch validation

- Preflight branch/base verification: **PASS**.
- Frozen-base ancestry compare after implementation: **PASS** — 8 commits ahead / 0 behind at `4a336820...`.
- Cross-lane diff audit: **PASS** — no renderer, theme renderer, live editor, mobile editor, storefront fetch/cache, performance/load-test, package, workflow, or deployment files changed.
- Draft PR #356 mergeability against `architecture/storefront-platform-v1`: **mergeable=true** at handoff time; no P0 branch conflict observed.

### GitHub Actions

A draft PR was opened only to exercise existing repository checks. `Quality Gate`, `Preview Smoke`, and `Secret Scan` runs terminated in approximately 3–4 seconds with no useful step/log payload. A parallel Lane B `Secret Scan` run showed the same immediate failure pattern, so these runs are recorded as **runner/workflow infrastructure unavailable for useful validation**, not as passing code tests. Lane A did not modify workflows.

### Vercel preview build / real compiler feedback

Automatic preview builds use the repository build path (`npm ci && npm run build`) and therefore run Next.js/TypeScript validation.

A preview for A4 failed with a concrete TypeScript error in `composition/defaults.ts`: `CompositionDocument` was not directly assignable to the CMS `Record<string, unknown>` props shape. This was a Lane A defect and was fixed in commit `4a33682041b4db8ec57fdc243d6d9c245c367fde` by constructing the persisted props object directly rather than forcing a type cast.

The preview for the exact fixed SHA `4a336820...` was **queued behind concurrent parallel-lane Vercel builds at handoff creation** (`dpl_62TtvqFzKCH4mBqoX6jmzMPjcbRy`). Therefore full build/typecheck success of the final implementation SHA is still pending external queue execution; it must be rechecked by the integration lane before merge. Do not interpret the earlier failed A4 preview as an unresolved defect—the reported type error was addressed by `4a336820...`.

## Dependency Requests

### DEPENDENCY REQUEST — Lane B: composition renderer integration

**Owner:** Lane B (Render & Theme)

Add runtime rendering support for `type: "composition"` only in Lane B-owned renderer/renderer-registry files. Parse/validate composition props via the Lane A composition schema before rendering. Map only registered primitive IDs; do not introduce eval, arbitrary component imports, or raw arbitrary rendering code. Where useful, renderer selection/fallback logic should consume Lane A canonical variant metadata rather than creating another duplicate variant map.

**Why:** Required for end-to-end storefront rendering of authored composition blocks. Lane A intentionally did not touch `StorefrontTemplateRenderer` or renderer implementation.

### DEPENDENCY REQUEST — Lane C: data-slot providers

**Owner:** Lane C (Mobile & Performance / storefront data ownership per coordination manifest)

Implement data providers/fetching that accept normalized `CompositionDataSlotRequest` contracts and return normalized payloads satisfying `validateCompositionDataSlotPayload`. Preserve Lane C ownership of actual storefront product/category/content fetching, caching, batching, and performance policy.

**Why:** Required for live dynamic collection slots. Static composition content works at the contract level without it.

### DEPENDENCY REQUEST — Lane D: editor authoring surface

**Owner:** Lane D (Editor)

Expose the `composition` block and recipe/variant metadata in the editor using `createRegistryDefaultBlock("composition", ...)` and the canonical registries. Authoring must stay within the allow-listed primitives, strict property schemas, bounded tree limits, and data-slot/binding contracts; do not expose arbitrary JavaScript or arbitrary JSON execution.

**Why:** Required for merchant/admin authoring. Lane A intentionally did not modify `StorefrontLiveEditor` or mobile editor UI.

### DEPENDENCY REQUEST — Integration lane: template-level availability

**Owner:** Integration coordinator

`src/lib/cms/storefront-templates.ts` remains integration-owned and contains template/block availability logic. Add or derive `composition` availability there only after renderer/editor readiness is confirmed. Prefer consuming the canonical registry over creating another independent hard-coded compatibility source when practical.

**Why:** Avoids exposing a persisted block type in guided template flows before its renderer/editor consumers land.

## Known Integration Risks

1. **New discriminated-union member:** `StorePageBlock` now includes `composition`. Exhaustive switches outside Lane A may need an explicit composition case. This is expected and must be handled by the owning renderer/editor lanes, not by Lane A.
2. **Intentional CMS props inference:** composition props are persisted through a `Record<string, unknown>` schema wrapper with strict runtime refinement. Consumers that need typed composition access should parse with `compositionDocumentSchema`; they should not blindly cast the CMS props object.
3. **Recipe media placeholders:** proof recipes contain safe internal placeholder media paths. Renderer/editor integration should support merchant media replacement and graceful missing-media fallback; compatibility resolution already provides a no-media `basic-content` fallback.
4. **Binding scope:** bindings reference the concrete data-slot node ID, not only the global slot type. A renderer must resolve repeated slot items deterministically within that node's scope.
5. **Dynamic payload safety:** Lane C/runtime providers should validate normalized payloads before exposing dynamic values to composition bindings.
6. **Final build is queue-pending:** the exact post-fix SHA had not started its Vercel build when this handoff was written because multiple parallel branches were occupying the preview queue.

## Discoveries

### P1 — Duplicate consumer-level variant definitions remain outside Lane A

**Description:** Renderer/editor components still contain variant-specific unions/maps in places outside Lane A ownership.

**Value:** Migrating those consumers to the canonical registry reduces drift between schema/editor/renderer capabilities.

**Dependency:** Lane B / Lane D.

**Recommended future phase:** During integration or immediately after v1 foundation, convert renderer/editor-local maps into adapters/consumers of the canonical registry. Do not expand the registry into renderer implementation code.

### P1 — Template block compatibility is still hard-coded in integration-owned code

**Description:** Template-level allowed/recommended block logic is partly maintained separately from the block registry.

**Value:** Registry-derived compatibility would prevent future blocks/recipes from requiring multiple backend wiring edits.

**Dependency:** Integration lane; coordinate with Lane D guided flows.

**Recommended future phase:** Make template availability a projection of canonical block/variant metadata once v1 consumers are stable.

### P1 — Universal composition should remain feature-gated until B/C/D consumers land

**Description:** Persistence/contracts now exist before the owned renderer, dynamic provider, and authoring surfaces.

**Value:** Prevents merchants from creating a block the current storefront cannot yet fully render/populate/edit.

**Dependency:** Lanes B, C, D and integration coordinator.

**Recommended future phase:** Enable broadly only after integration tests prove renderer + editor + dynamic slot behavior.

### P2 — Rich-text primitive is deliberately narrower than full arbitrary rich HTML

**Description:** v1 rich-text composition uses bounded paragraph data rather than arbitrary HTML/Tiptap payload injection.

**Value:** Keeps Universal Composition safe and portable.

**Dependency:** Future shared safe-rich-text adapter if richer semantics are required.

**Recommended future phase:** Add a versioned sanitized rich-text document primitive rather than arbitrary HTML.

### P2 — Performance classes are semantic, not numeric budgets

**Description:** v1 declares `light`, `standard`, `media-heavy`, and `interactive` rather than hard-coding byte/CPU budgets in contracts.

**Value:** Keeps composition metadata stable while allowing Lane C to evolve concrete performance budgets by device/network tier.

**Dependency:** Lane C performance policy.

**Recommended future phase:** Map semantic classes to measurable bundle/media/interaction budgets and automated performance checks.

### P2 — URL policy may need controlled expansion later

**Description:** dynamic links/media are intentionally limited to safe internal/HTTPS (plus mailto/tel for links) forms.

**Value:** Blocks dangerous protocols and keeps data bindings predictable.

**Dependency:** Future asset/storage requirements.

**Recommended future phase:** If signed/blob/CDN schemes are required, add them explicitly through a schema-versioned allow-list instead of loosening validation globally.

## What Remains

Lane A's defined A1–A5 implementation scope is complete. Remaining work is integration/consumer work owned elsewhere plus final validation:

1. Recheck the exact fixed SHA preview build when the external Vercel queue executes it; resolve only Lane A-owned compiler/test defects if any appear.
2. Lane B renders the composition tree and consumes registry contracts.
3. Lane C implements normalized data-slot providers/fetch/cache behavior.
4. Lane D exposes safe composition/recipe authoring in the editor.
5. Integration lane controls template-level availability and performs cross-lane integration tests.
6. Keep PR #356 draft until integration owner decides it is ready; Lane A must not merge it.
