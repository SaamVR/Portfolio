# Storefront Platform v1 — Lane B Handoff

## Checkpoint status

- Lane: B — Rendering, Shells & Aesthetic Engine
- Branch: `arch/v1-render-theme`
- Frozen `BASE_SHA`: `b1ba310bae98ed3145990ff1fd9af4077cf557fe`
- Base source: `design/threads-admin-template`
- Integration branch: `architecture/storefront-platform-v1`
- Latest implementation SHA before this handoff-only commit: `679f431469433943d5e2d4c4a41ee61679604c70`
- Base ancestry check: PASS — compare reports merge-base exactly equal to frozen `BASE_SHA`, branch ahead by 16 implementation commits and behind by 0.
- Ownership check: PASS — implementation diff touches only Lane B-owned storefront renderer/theme files and new Lane B rendering/platform paths. This handoff file is the only documentation addition.
- Merge/deploy status: no merge; no production deployment.

The coordination document and lock manifest were read from `architecture/storefront-platform-v1` before any write because the lane branches were frozen at `BASE_SHA` before the coordination-only documentation commits landed.

## Completed gates

### B1 — Renderer family registry

PASS.

Added `src/lib/cms/storefront-platform/rendering/renderer-registry.ts` and replaced template-specific block-renderer branching in `StorefrontTemplateRenderer` with registry resolution.

Current justified families are intentionally small:

- `generic-commerce`
- `editorial-commerce`

Current implementations:

- `generic`
- `fashion-v3`
- `threads-earthy`

The registry consumes the existing Integration-owned `StorefrontTemplateDefinition.rendererKind` contract. No CMS/schema or central template-registry shape was changed.

### B2 — Shell registry

PASS.

Added `src/lib/cms/storefront-platform/rendering/shell-registry.ts` and `StorefrontShellBoundary` so page chrome/shell selection resolves independently from block rendering.

Current shells:

- `classic-commerce`
- `fashion-v3`
- `threads-earthy`

`StorefrontShell` is now generic and no longer contains a hidden Threads branch. Existing Fashion V3 and Threads shell markup was not redesigned.

### B3 — Code splitting / public-editor boundary

PASS for Lane B-owned boundaries.

- Fashion V3 block renderer is loaded with `next/dynamic`.
- Threads block renderer is loaded with `next/dynamic`.
- Fashion V3 shell is loaded with `next/dynamic`.
- Threads shell is loaded with `next/dynamic`.
- Public specialized renderers/shells do **not** set `ssr:false`; Next's SSR-capable default is preserved.
- Generic renderer/shell stay static baseline paths.
- `StorefrontAdminMode` is dynamically isolated with `ssr:false` because it is admin-only browser interaction and should not be eagerly bundled into the normal shopper path.
- A guard test fails if specialized renderer/shell imports become static again or if public specialized boundaries add `ssr:false`.

No aesthetic mode adds or swaps a JS framework. Flat/Glass/Editorial/Artisan are CSS-token/profile transformations.

### B4 — Semantic design tokens

PASS.

Added semantic storefront tokens including:

- surface / surface-muted / surface-inverse
- text / text-muted / text-inverse
- brand / brand-foreground
- accent / accent-foreground
- border
- card/control/media radius
- section/card spacing
- card elevation
- decoration/effect/motion/parallax intensity

Merchant palette authority is preserved: semantic color tokens alias existing merchant variables such as `--background`, `--foreground`, `--primary`, and `--accent` rather than substituting template-specific colors.

No variables such as `threads-green`, `craft-orange`, or `fashion-black` were introduced.

### B5 — Aesthetic engine

PASS foundation implementation.

Added a scoped semantic aesthetic engine with proof mappings:

- stored `minimal` → engine `flat`
- stored `editorial` → engine `editorial`
- stored `glassmorphism` → engine `glass`
- stored `artisan` → engine `artisan`

The engine transforms presentation only: surface opacity, border treatment, blur, elevation, radius character, typography tracking/scale, decoration density, motion duration, overlap, and parallax offset. It does not replace merchant colors, logo, products, content, navigation data, or commerce behavior.

Mobile reductions are encoded in scoped CSS:

- Glass: lower blur, lighter elevation, lower decoration, restrained motion, parallax disabled.
- Editorial: reduced display scale and overlap disabled.
- Artisan: reduced decoration density.
- `prefers-reduced-motion: reduce`: motion duration and parallax are forced down within the storefront scope.

`StoreThemeScope` resolves the existing merchant theme first, then semantic/aesthetic presentation variables. Merchant scoped custom CSS remains later in source order so merchant overrides remain authoritative.

### B6 — Shared surface abstraction

PASS foundation primitive; broader adoption is intentionally deferred where ownership is shared/unassigned.

Added `src/components/storefront/platform/StorefrontSurface.tsx`, an opt-in aesthetic-aware surface primitive driven by semantic data attributes/tokens rather than a hard-coded Glass component library.

Existing production Fashion/Threads sections were not mass-converted, specifically to preserve their current legitimate appearance during the architecture migration.

## Files changed

Lane B implementation:

- `src/components/storefront/StorefrontTemplateRenderer.tsx`
- `src/components/storefront/StoreThemeScope.tsx`
- `src/components/storefront/StorefrontShell.tsx`
- `src/components/storefront/platform/StorefrontRendererBoundary.tsx`
- `src/components/storefront/platform/StorefrontShellBoundary.tsx`
- `src/components/storefront/platform/StorefrontSurface.tsx`
- `src/components/storefront/platform/StorefrontAestheticIntegration.test.tsx`
- `src/lib/cms/storefront-platform/rendering/renderer-registry.ts`
- `src/lib/cms/storefront-platform/rendering/shell-registry.ts`
- `src/lib/cms/storefront-platform/rendering/theme-tokens.ts`
- `src/lib/cms/storefront-platform/rendering/aesthetic-engine.ts`
- `src/lib/cms/storefront-platform/rendering/registries.test.ts`
- `src/lib/cms/storefront-platform/rendering/theme-tokens.test.ts`
- `src/lib/cms/storefront-platform/rendering/aesthetic-engine.test.ts`
- `src/lib/cms/storefront-platform/rendering/code-splitting.test.ts`

Documentation:

- `docs/handoffs/storefront-platform-v1-lane-b.md`

No Lane A schema/registry files, Lane C data/cache hooks, Lane D editor files, Integration-owned template registry/seeds, `package.json`, lockfiles, workflows, deployment configuration, `src/index.css`, `CmsPagesManager`, or `StorefrontPage` were modified.

## Validation

### Targeted Lane B tests

PASS — 10/10 tests.

Executed with `tsx --test` against:

- `StoreThemeScope.test.tsx`
- `StorefrontAestheticIntegration.test.tsx`
- `aesthetic-engine.test.ts`
- `code-splitting.test.ts`
- `registries.test.ts`
- `theme-tokens.test.ts`

Result: 10 passed, 0 failed.

### Repository typecheck

PASS.

`npm run typecheck` completed with exit code 0 on the isolated Lane B validation worktree.

### Production build

PARTIAL PASS / ENVIRONMENT BLOCKED AFTER COMPILE.

The first attempt used the machine default Node 18 and correctly stopped because the repository requires Node 24.x. Retried with NVM Node `v24.19.0` / npm `11.17.0`.

Under Node 24:

- optimized production compilation: PASS (`Compiled successfully`)
- build TypeScript phase: PASS (`Finished TypeScript`)
- static-page generation: BLOCKED by missing validation-environment `NEXT_PUBLIC_SUPABASE_URL`; Next failed prerendering `/_not-found` with `supabaseUrl is required`.

No production/environment secrets were injected and no deployment configuration was changed merely to make the isolated validation build finish.

A pre-existing Tailwind warning about ambiguous `ease-[cubic-bezier(...)]` also appeared; no Lane B changed file contains that class.

## Bundle / code-splitting evidence

Source and guard-test evidence:

- `StorefrontTemplateRenderer.tsx` no longer statically imports `fashion-v3/**` or `threads/**` renderer/shell modules.
- `StorefrontRendererBoundary.tsx` contains dynamic imports for `FashionV3BlockRenderer` and `ThreadsBlockRenderer`.
- `StorefrontShellBoundary.tsx` contains dynamic imports for `FashionV3Shell` and `ThreadsShell`.
- Public specialized boundaries contain no `ssr:false`.
- Admin-only `StorefrontAdminMode` is the intentionally client-only dynamic boundary.
- `code-splitting.test.ts` passed.

The partially completed production build emitted separate static chunks containing specialized Fashion/Threads presentation code before static-page generation encountered the missing Supabase environment variable, which is consistent with the intended dynamic boundaries.

## Dependency requests

DEPENDENCY REQUEST
- owning lane: Integration
- file/contract: `src/components/MobileBottomNav.tsx`, `src/components/Navbar.tsx`, and ownership of shared storefront chrome surfaces
- required change: Assign a single owner for these currently shared/unassigned chrome files; once assigned, migrate only aesthetic-specific container styling (for example hard-coded backdrop blur/translucent surfaces) to Lane B's semantic surface/token API where appropriate, while preserving all navigation/mobile behavior.
- reason: Lane B discovery found hard-coded shared surface treatment outside its exclusive ownership. The lock protocol requires newly discovered shared files to receive one owner before modification, and Lane B must not rewrite Lane C/mobile navigation behavior.
- blocking or non-blocking: non-blocking

No Lane A schema dependency is blocking this checkpoint. Lane B deliberately consumes the existing `rendererKind` contract rather than changing it.

## Post-foundation architecture backlog

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P1
- title: Evolve renderer-family metadata only when additional specialized families become real
- evidence: Current code has dedicated specialized implementations only for Fashion V3 and Threads; catalog/spec, menu, booking/listing/service templates currently share the generic renderer path.
- affected files/contracts: Integration-owned `src/lib/cms/storefront-templates.ts`; Lane A/Integration contracts as ownership is assigned; Lane B renderer registry.
- recommended follow-up: When an actual specialized catalog/spec/menu/service renderer exists, add explicit family metadata through the owning contract instead of reintroducing template-id branching. Do not create speculative families before implementation exists.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P1
- title: Migrate shared storefront chrome away from hard-coded aesthetic surfaces
- evidence: `MobileBottomNav` / `Navbar` contain translucent/backdrop-blur presentation outside Lane B ownership.
- affected files/contracts: `src/components/MobileBottomNav.tsx`, `src/components/Navbar.tsx`, `src/components/Layout.tsx`, Lane B `StorefrontSurface`/semantic token API.
- recommended follow-up: After Integration assigns ownership, preserve behavior and replace only aesthetic-specific chrome treatment with semantic surfaces.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P2
- title: Consolidate legacy theme presentation mapping with the semantic aesthetic engine
- evidence: Existing `src/lib/cms/store-theme-style.ts` has legacy aesthetic shadow/tracking presentation mappings while Lane B now provides scoped semantic presentation profiles.
- affected files/contracts: `src/lib/cms/store-theme-style.ts`, Lane B `theme-tokens.ts`, `aesthetic-engine.ts`, StoreThemeScope.
- recommended follow-up: After editor/contract integration stabilizes, define one compatibility path and retire duplicate presentation semantics without changing persisted merchant aesthetic values.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P2
- title: Consider server-first theme bootstrap if Lane C profiling justifies it
- evidence: `StoreThemeScope` remains a client component because it respects visitor theme preference through `next-themes`.
- affected files/contracts: `StoreThemeScope`, public storefront runtime boundary.
- recommended follow-up: Let Lane C measure hydration/bundle impact first; only split server-safe token bootstrap from visitor-preference client logic if profiling shows material value.

## Integration concerns

- Merge Lane A first as specified by coordination, then reconcile Lane B against Lane A's public contracts without importing Lane A private implementation files.
- Lane B currently relies only on the existing `StorefrontTemplateDefinition.rendererKind` shape from the Integration-owned central template registry.
- Lane D can continue storing the existing aesthetic enum values. Lane B maps those values into the four proof engine profiles without requiring an editor/schema change.
- Lane C should validate the combined public bundle and mobile runtime after integration; Lane B's code-splitting guard provides the intended import boundary but is not a substitute for Lane C's performance measurements.
- Specialized Fashion/Threads renderer and shell markup was not redesigned. The migration changes selection/loading architecture, not intended visual output.
- The semantic aesthetic engine is opt-in at shared-surface attributes; existing legitimate template surfaces are not globally repainted merely because the engine exists.

## Remaining work

- Integration branch merge/reconciliation in prescribed order; no merge performed by Lane B.
- Resolve the non-blocking shared-chrome ownership dependency before broader semantic-surface migration.
- Lane C bundle/mobile measurement after Lane A + Lane B integration.
- Final integration audit should run a fully environment-configured production build and representative visual-regression checks for Fashion Classic/V3 and Threads before release.
