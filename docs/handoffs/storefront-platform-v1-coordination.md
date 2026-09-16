# Storefront Platform v1 Coordination

## Status

Coordination-only foundation workspace for parallel GPT-runtime development. This branch setup changes no production behavior and is not an implementation lane.

- Repository: `SaamVR/EcomCMS`
- Live default branch observed before write: `main`
- Live `main` HEAD observed before write: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- Frozen `BASE_SHA`: `b1ba310bae98ed3145990ff1fd9af4077cf557fe`
- Base source: `design/threads-admin-template`
- Integration branch: `architecture/storefront-platform-v1`
- Lane A: `arch/v1-composition`
- Lane B: `arch/v1-render-theme`
- Lane C: `arch/v1-mobile-performance`
- Lane D: `arch/v1-editor`

### Why this base

`checkpoint/threads-reference-v1-2026-09-12` is not current: `design/threads-admin-template` is five commits ahead of that checkpoint. The latest Threads head is also sixteen commits ahead of the accepted Fashion V3 earthy-refine checkpoint and contains the current Threads template/editor/rendering work that this foundation must preserve.

`main` is the live default branch, but the Threads working line has intentionally diverged from `main` while carrying the current storefront/template work. Open PR #305 explicitly documents equivalent synchronization of the recent mainline shopper-truth and platform-admin routing fixes without linear ancestry. Therefore the foundation lanes are frozen on the latest Threads working head instead of silently dropping the current Threads state or reviving the older checkpoint.

No lane may move its base to a later `main`, checkpoint, PR head, or sibling branch without an explicit coordinator decision.

## Live-state reconciliation snapshot

Relevant open work observed before branch creation includes:

- PR #305 — merchant/admin UX plus shared storefront compatibility work; overlaps editor/admin/storefront surfaces and must not be mixed into a lane ad hoc.
- PR #344–#349 — stacked Fashion V2 storefront work.
- PR #353 — Fashion V3 earthy emerald refinement.
- PR #321 — Commerce Flow homepage V2 design lane.
- PR #303 — focused Products UX fallback.
- PR #126/#127/#128 — storefront/admin audits and platform roadmap documentation.

Existing Threads refs observed:

- `checkpoint/threads-reference-v1-2026-09-12` → `b9602dc1c33ef1396634babea9219cfd9fef5780`
- `design/threads-pixelmatch-wip` → `ab0e5854450bd9c27afb9fb6801918aa56e1dd68`
- `design/threads-admin-template` → `b1ba310bae98ed3145990ff1fd9af4077cf557fe`

The foundation program must preserve behavior. It must not redesign Threads, Fashion, or any other template while extracting platform contracts.

## Lane scope and ownership

| Lane | Scope | Exclusive ownership |
|---|---|---|
| A — Composition / Contracts | CMS block/variant contracts; canonical variant registry; composition block schema; composition primitive registry; composition recipe registry; compatibility metadata; schema contract changes required by those systems | `src/lib/cms/schema.ts`, `src/lib/cms/schema.test.ts`, `src/lib/cms/block-registry.ts`, block-registry tests, and new composition/variant registry files created under `src/lib/cms/storefront-platform/composition/**` and `src/lib/cms/storefront-platform/variants/**` |
| B — Rendering / Theme | Renderer-family registry; shell registry; rendering selection; specialized renderer lazy loading; semantic theme token resolution; aesthetic engine; StoreThemeScope implementation | `src/components/storefront/StorefrontTemplateRenderer.tsx`, `src/components/storefront/StoreThemeScope.tsx`, `src/components/storefront/StorefrontBlockRenderer.tsx`, `src/components/storefront/StorefrontShell.tsx`, specialized renderer directories such as `src/components/storefront/threads/**` and `src/components/storefront/fashion-v3/**` when behavior-preserving wiring is required, plus new renderer/shell/theme files under `src/components/storefront/platform/**` and `src/lib/cms/storefront-platform/rendering/**` |
| C — Mobile Performance / Data | Performance baselines; public storefront bundle/performance tests; storefront data-access abstraction; cache correctness tests; media/image policy; font-loading/performance policy; load-test tooling; shopper mobile performance primitives that do not alter editor files | `src/lib/cms/store-resolver.ts` and its focused tests when required for the data-access abstraction; new performance/data/cache/media/font files under `src/lib/storefront-platform/**`, `src/components/storefront/performance/**`, and dedicated storefront performance/load-test files. Existing editor files are excluded. |
| D — Editor | StorefrontLiveEditor and editor-only UI; metadata-driven editor integration; mobile editor shell/bottom sheets; variant/aesthetic/composition controls; merchant autosave/draft UX; editor viewport/mobile interaction | `src/components/storefront/StorefrontLiveEditor.tsx`, `src/components/storefront/BasicModeEditor.tsx`, `src/components/admin/StorefrontSectionStyleStudio.tsx`, `src/lib/cms/storefront-editor-registry.ts` and its tests, plus new editor-only files under `src/components/storefront/editor/**` and `src/lib/cms/storefront-platform/editor/**` |

Ownership is exclusive. A lane may import another lane's public contract but may not modify that lane's owned file.

## Protected/shared files

The following files are protected by a single owner even when multiple lanes consume them:

| File / area | Owner | Rule |
|---|---|---|
| `package.json` | Integration | Lanes request dependencies/scripts; they do not edit it. |
| package lockfile(s) | Integration | Must be changed only with an approved integration dependency request. |
| `.github/workflows/**` | Integration | No lane CI rewiring. |
| production/deployment configuration (`vercel.json`, Railway/Render/deployment config, provider config) | Integration | No lane deployment configuration changes. |
| `src/lib/cms/storefront-templates.ts` and central template-registry tests | Integration | This is the shared storefront template registry and shared template-type boundary. Lanes must use dependency requests for additions/shape changes. |
| `src/lib/cms/storefront-template-seeds.ts`, central template seed/demo registration files | Integration | Prevents composition/editor/render lanes from racing on template registration. |
| `src/lib/cms/schema.ts` | Lane A | Canonical persisted CMS schema contract. |
| `src/lib/cms/block-registry.ts` | Lane A | Canonical block contract/registry. |
| `src/components/storefront/StorefrontTemplateRenderer.tsx` | Lane B | Rendering selection boundary. |
| `src/components/storefront/StoreThemeScope.tsx` | Lane B | Theme scope/token application boundary. |
| `src/components/storefront/StorefrontBlockRenderer.tsx` | Lane B | Shared block rendering boundary. |
| `src/components/storefront/StorefrontLiveEditor.tsx` | Lane D | Live editor boundary. |
| `src/index.css` | Integration | Global stylesheet is shared. Lanes should prefer scoped/new files and request any global rule change. |
| `src/views/admin/CmsPagesManager.tsx` | Integration | Shared high-conflict editor/admin orchestrator; also overlaps current merchant UX work. Lane D must request any required wiring. |
| `src/components/storefront/StorefrontPage.tsx` | Integration | Shared runtime orchestration boundary; lanes must not race on it. |

If a file not listed above becomes shared during implementation, work stops on that file until the coordinator assigns exactly one owner. The discovery itself is not permission for concurrent edits.

## Dependency request protocol

If a lane needs a change in another lane's or Integration's file, it must not edit that file. Record this exact block in the lane handoff:

```text
DEPENDENCY REQUEST
- owning lane: <A|B|C|D|Integration>
- file/contract: <exact path or contract>
- required change: <minimal requested change>
- reason: <why this lane needs it>
- blocking or non-blocking: <blocking|non-blocking>
```

The owner implements the request on its own branch or the Integration branch. Cross-lane cherry-picks that contain foreign-owned file edits are prohibited.

## Checkpoint protocol

Each lane has approximately 25 minutes maximum active GPT/tool runtime before a checkpoint, even if unfinished.

At each checkpoint the lane must:

1. Confirm it is still on its assigned branch and descended from the frozen `BASE_SHA`.
2. Stop expanding scope.
3. Commit only coherent lane-owned work. If a safe coherent commit is impossible, leave code uncommitted and record the exact blocker rather than forcing a broken contract commit.
4. Record current head SHA, changed files, tests/validation, dependency requests, unresolved blockers, and architecture backlog discoveries in the lane handoff.
5. Do not merge, deploy, rebase onto moving `main`, or continue an unbounded autonomous loop.

A lane may checkpoint earlier when a logical milestone is complete.

## P0 interruption rule

Only these conditions may interrupt or change the active foundation scope:

- security issue;
- data-loss/corruption risk;
- architecture flaw that invalidates the current implementation;
- major performance regression that makes the current design unacceptable;
- unavoidable dependency preventing the lane from completing.

Everything else is deferred as P1 or P2 Post-Foundation Architecture Backlog.

## Architecture-discovery backlog protocol

Lanes should continue noticing architectural improvements, but must not implement unrelated discoveries during the foundation runtime.

Each discovery goes into the lane handoff as:

```text
POST-FOUNDATION ARCHITECTURE BACKLOG
- priority: P1|P2
- title: <short title>
- evidence: <what exposed the issue>
- affected files/contracts: <paths/contracts>
- recommended follow-up: <focused next action>
```

P1 means important follow-up after foundation stabilization. P2 means useful optimization/refinement. A discovery is promoted to P0 only if it meets the interruption rule above.

## Concurrent-edit prevention rules

1. All four lane branches start from exactly `b1ba310bae98ed3145990ff1fd9af4077cf557fe`.
2. No lane edits another lane's owned files.
3. No lane edits Integration-owned files.
4. No lane merges a sibling lane into itself.
5. No lane rebases onto moving `main` or an updated Threads branch during active foundation work.
6. No lane redesigns templates while extracting architecture.
7. No lane changes production deployment configuration or triggers a production deployment.
8. No lane performs unrelated cleanup, mass formatting, or dependency upgrades.
9. Shared-contract consumers must compile against explicit exported interfaces; temporary duplicate contract definitions are not allowed.
10. Any newly discovered shared file gets one owner before modification.

## Merge order into the integration branch

The intended merge sequence is:

1. Lane A — Composition / Contracts
2. Lane B — Rendering / Theme
3. Lane C — Mobile Performance / Data
4. Lane D — Editor
5. Final integration audit/reconciliation

Rationale: renderer/theme work may consume Lane A contracts; the performance/data lane then validates the combined public runtime shape; the editor lane integrates last because it consumes metadata/contracts and renderer/theme behavior while owning the highest-conflict merchant interaction surface.

Before each integration merge, resolve blocking dependency requests and validate that the incoming diff touches only the lane's allowed ownership plus its handoff/tests. Do not merge to `main` as part of this program setup.

## Finish condition for this coordination lane

This coordination lane is complete when:

- the integration branch exists from the frozen base;
- all four lane branches exist from the same frozen base;
- this coordination document and the lock manifest exist on the integration branch;
- no application behavior, production configuration, template design, database schema, or deployment was changed.
