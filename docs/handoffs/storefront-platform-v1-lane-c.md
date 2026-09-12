# Storefront Platform v1 — Lane C Final Handoff

## Identity and status

- Program: EZComo / EcomCMS Storefront Platform v1 foundation
- Lane: C — Mobile Shopper, Performance, Data, Cache & Media
- Branch: `arch/v1-mobile-performance`
- Frozen `BASE_SHA`: `b1ba310bae98ed3145990ff1fd9af4077cf557fe`
- C2 implementation SHA: `ede14ef598d945d578c903d8a3bd2d5e9b90b22c`
- FINAL C SHA (code): `ede14ef598d945d578c903d8a3bd2d5e9b90b22c`
- Final branch HEAD: this handoff-only successor commit; authoritative exact SHA is reported after commit/push in the final Lane C response.
- No C3 was started. The recovery pass only finalized interrupted C2 work.
- No merge to integration/main and no production deployment occurred.

## C1 / C2 scope completed

C1 established the measurable baseline before optimization. C2 added only Lane C-owned foundations for normalized storefront data access, request dedupe, cache-policy verification, mobile shopper action primitives, responsive media policy, mobile effect guardrails, measured regression budgets, and a controlled load-test harness.

The recovery pass preserved the unfinished C2 work, found and removed an invalid resolver-level `react/cache` experiment that caused server resolver code to enter the shopper client graph, reran targeted validation, and finalized this handoff. The committed implementation does **not** modify `src/lib/cms/store-resolver.ts` or any other pre-existing shared application file.

## Exact implementation files changed

- `scripts/storefront-load-smoke.mjs`
- `scripts/storefront-performance-budget.mjs`
- `src/components/storefront/performance/MobileStorefrontActionBar.tsx`
- `src/components/storefront/performance/PerformanceStorefrontImage.tsx`
- `src/lib/storefront-platform/cache/cache-policy.ts`
- `src/lib/storefront-platform/cache/cache-policy.test.ts`
- `src/lib/storefront-platform/cache/cache-source-contract.test.ts`
- `src/lib/storefront-platform/data/store-resolver-cache-contract.test.ts`
- `src/lib/storefront-platform/data/storefront-data-controller.ts`
- `src/lib/storefront-platform/data/storefront-data-controller.test.ts`
- `src/lib/storefront-platform/data/storefront-data-server.ts`
- `src/lib/storefront-platform/effects/effect-policy.ts`
- `src/lib/storefront-platform/effects/effect-policy.test.ts`
- `src/lib/storefront-platform/media/media-policy.ts`
- `src/lib/storefront-platform/media/media-policy.test.ts`
- `src/lib/storefront-platform/media/media-source-budget.test.ts`
- `src/lib/storefront-platform/mobile/mobile-action.ts`
- `src/lib/storefront-platform/mobile/mobile-action.test.ts`
- `src/lib/storefront-platform/mobile/mobile-action-bar-contract.test.ts`
- `src/lib/storefront-platform/mobile/mobile-viewport.ts`
- `src/lib/storefront-platform/performance/budgets.ts`
- `src/lib/storefront-platform/performance/budgets.test.ts`

This handoff file is the only additional finalization file.

## Tests and targeted validation

Final recovery validation used Node `24.19.0` / npm `11.17.0`.

- `npm run typecheck` — PASS.
- Targeted Node/tsx tests — PASS, 34/34:
  - existing `src/lib/cms/store-resolver.test.ts`
  - existing 44px wishlist touch-target contract
  - all new `src/lib/storefront-platform/**/*.test.ts` contracts.
- ESLint over all Lane C-owned source/components/scripts — PASS.
- `git diff --cached --check` for implementation commit — PASS.
- Ownership gate before commit — PASS: 22 new implementation files matched Lane C-owned paths; tracked shared-file modifications were empty.
- Production `next build --webpack` — webpack compilation PASS in 49s; Next TypeScript phase PASS in 72s; final prerender remains environment-blocked because this isolated runtime lacks `NEXT_PUBLIC_SUPABASE_URL` and fails at `/_not-found` with `supabaseUrl is required`. This is not reported as a production-build pass.

## Performance baseline and evidence

Runtime 1 measured the `/[slug]` storefront client-reference graph at:

- 31 JS chunks
- 1,413,798 raw bytes
- 385,464 gzip bytes
- webpack compile 114s
- TypeScript 70s
- full build environment-blocked at missing Supabase configuration.

After C2 cleanup, the same Lane C worktree measured:

- 31 JS chunks
- 1,413,460 raw bytes
- 385,210 gzip bytes
- no regression against the captured C1 baseline
- zero storefront client chunks containing the removed resolver/request-cache signatures.

A detached frozen-base control rebuild in a different worktree measured 31 chunks / 1,413,444 raw / 385,513 gzip. Because webpack chunk identities differed across absolute worktree paths, byte comparisons across different worktrees are treated as supporting evidence only. The same-worktree C1-to-final comparison is the regression check recorded above.

The measured raw `<img>` occurrence baseline across storefront/app TSX remains 14; C2 does not increase it.

Web-vital values LCP <= 2.5s, CLS <= 0.10, and INP <= 200ms remain reference targets only. No synthetic or fixture number is presented as a real-user Web Vital pass.

## Data-access findings

The existing application already centralizes primary server product/search truth and tagged public caching. C2 adds a normalized `createStorefrontDataController` contract with stable request keys and in-flight dedupe for store, products, and search reads, plus a request-scoped server adapter.

Identical concurrent reads collapse to one underlying promise; failed reads are evicted so retry can recover. Product ID ordering is normalized in request keys, and preview state participates in keys so public and private requests cannot collide.

An attempted direct `react/cache` wrapper inside `store-resolver.ts` was rejected during recovery because it made resolver signatures appear in a shopper client chunk. That change was fully removed before commit. Existing public resolver reads therefore retain their established tagged `unstable_cache` path, while preview-token reads continue bypassing it.

## Cache correctness findings

- Anonymous storefront APIs use the existing shared public cache path where intended.
- Validated preview requests remain private/no-store.
- Blank preview tokens normalize to public behavior rather than creating a false private partition.
- Product and search route source contracts explicitly separate preview responses from public cache responses.
- Merchant cache revalidation remains authenticated/authorized, returns no-store, and invalidates store/product/content tags as existing code defines.
- No preview/private state is stored in the new shared cache policy.

## Media / image findings

The media policy provides mobile-first responsive `sizes`, lazy loading by default, priority only for a genuine LCP hero, focal-point clamping, recommended aspect boxes, and rejection of oversized or malformed inline data-image payloads. `PerformanceStorefrontImage` adapts those rules to the existing `SafeStorefrontImage` abstraction without replacing renderer-owned image code in this lane.

The raw `<img>` regression test holds the measured foundation baseline at <=14 occurrences. Broad replacement of existing renderer/blog/editor image usage was intentionally not performed because it would cross ownership or expand scope.

## Mobile storefront findings

- Explicit compact-mobile validation widths: 360, 390, 430.
- Viewport tiers also cover mobile, tablet, and desktop.
- Minimum touch guidance: 44px; primary action primitive: 48px.
- `MobileStorefrontActionBar` is safe-area aware, touch-manipulation friendly, focus-visible, mobile-only, and has no hover-only interaction requirement.
- Contextual action resolver reuses existing navigation/order experience contracts:
  - multi-product commerce -> cart
  - single product -> buy
  - booking/hotel -> book
  - service/inquiry/property/listing -> contact, using configured WhatsApp when available
  - digital download -> digital purchase/download path.
- Mobile effect policy disables continuous JS motion, parallax, hover effects, and backdrop filters on constrained mobile; reduced-motion/save-data force reduced effects on larger viewports too.

## Load-test and performance-budget findings

`storefront-performance-budget.mjs` measures the emitted `[slug]` client-reference graph against the captured C1 baseline and flags any unexplained chunk/raw/gzip increase. It is intentionally regression-oriented rather than an arbitrary absolute byte budget.

`storefront-load-smoke.mjs` is bounded to max 100 requests / max concurrency 10, accepts homepage/catalog/products/search/product targets, and reports p50, p95, error rate, and throughput. It refuses non-local/non-staging hosts unless `ALLOW_STOREFRONT_LOAD_TARGET=1` is explicitly supplied.

The C2 controlled localhost fixture self-test exercised all five target classes with 8 requests at concurrency 2 and zero errors. Fixture p50/p95 values ranged roughly 6–14ms / 10–179ms depending on target. These are harness-validation numbers only, not production or staging storefront performance claims. A direct attempt against `sam.ezcomo.shop` was correctly refused by the safety gate.

## Dependency requests

DEPENDENCY REQUEST
- owning lane: B
- file/contract: `src/components/storefront/StorefrontTemplateRenderer.tsx` and Lane B renderer-family registry/lazy-loading boundary
- required change: ensure only the active specialized renderer family is in the active public shopper initial graph; do not statically retain inactive generic/Fashion/Threads families.
- reason: frozen-base C1 evidence showed all renderer families in the storefront client-reference graph. Lane B owns this boundary and may already address it; C must not duplicate that work.
- blocking or non-blocking: non-blocking for Lane C; blocking for final integrated public-bundle sign-off.

DEPENDENCY REQUEST
- owning lane: Integration
- file/contract: `src/components/storefront/StorefrontPage.tsx` in coordination with Lane D's editor boundary
- required change: separate merchant/editor-only `StorefrontLiveEditor` loading from the anonymous shopper dependency graph, preferably behind a conditional/lazy boundary that preserves merchant behavior.
- reason: frozen-base C1 showed the client storefront orchestration statically importing editor/auth-capable code although anonymous shoppers do not render the editor.
- blocking or non-blocking: non-blocking for Lane C; blocking for final integrated public-bundle sign-off.

## INTEGRATION VALIDATION REQUIRED

- Verify Lane B's renderer isolation after A+B+C are combined; isolated Lane C must not reproduce Lane B locally.
- Verify the normalized Lane C data-controller contracts against Lane A composition/variant contracts after merge, especially any dynamic data-slot consumers.
- Verify mobile action/effect/media primitives in the real Lane B shells/renderers at 360/390/430/tablet/desktop without cross-editing those owned files from C.
- Verify anonymous storefront bundle composition after the Integration/D editor split; the final bundle measurement must use the combined integration tree.
- Verify full editor/storefront interaction after Lane D is combined so shopper performance guardrails do not alter merchant preview/editor behavior.
- Run controlled staging load measurements with representative store/product/search data once the combined tree has valid environment configuration. Do not extrapolate the localhost fixture timings.

## Post-Foundation Architecture Backlog

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P1
- title: Incremental adoption of normalized storefront data controller
- evidence: renderer-specific reads still exist outside Lane C-owned files, while C2 provides the normalized adapter/controller seam.
- affected files/contracts: renderer/shell/runtime consumers owned by B or Integration; `src/lib/storefront-platform/data/**`.
- recommended follow-up: migrate consumers incrementally after foundation integration; do not build a full page dependency planner during foundation.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P1
- title: Public shopper server/client boundary reduction
- evidence: C1 frozen-base graph includes shopper orchestration plus merchant/editor dependencies.
- affected files/contracts: `StorefrontPage.tsx`, editor loading boundary, renderer selection.
- recommended follow-up: after foundation stabilization, evaluate a focused Server Component/client-island split. Do not perform a full rewrite as part of Lane C.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P2
- title: Broader responsive media migration
- evidence: raw `<img>` foundation baseline remains 14 and existing specialized renderers do not uniformly provide responsive `sizes`.
- affected files/contracts: renderer/blog/media consumers plus Lane C media policy.
- recommended follow-up: migrate opportunistically by owning lane using `SafeStorefrontImage` / Lane C media policy; avoid mass redesign.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P2
- title: Real-user Web Vitals and representative staging load data
- evidence: current C2 evidence is build-graph measurement and controlled harness validation; it is not RUM.
- affected files/contracts: performance observability and staging validation process.
- recommended follow-up: collect LCP/CLS/INP from real users and repeat bounded load tests against an approved staging environment.

POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P2
- title: Distributed cache only if measurement proves need
- evidence: current architecture already has tagged Next/public cache paths and no C2 evidence requires Redis.
- affected files/contracts: future cache/infrastructure design.
- recommended follow-up: evaluate Redis/distributed cache only after staging/production measurements demonstrate a concrete bottleneck.

## Final ownership confirmation

The C2 implementation commit contains only new files under Lane C-owned `src/lib/storefront-platform/**`, `src/components/storefront/performance/**`, and dedicated performance/load-test scripts. No Lane A/B/D-owned file, Integration-owned registry/package/workflow/deployment file, or production configuration is modified. No C3 was started.
