# Runtime 7 new-chat handoff — 2026-09-15

## Canonical candidate
- Repository: `SaamVR/EcomCMS`
- Convergence branch: `release/r4-p0-convergence-2026-09-15`
- Latest implementation checkpoint before this handoff: `c5fc7a6b6f7acea136d2b2f16b7741b88e7d46f4`
- Parent convergence merge: `c6305424419de1d5adcd419817a51846d1feca66`
- `c5fc7a6` adds storefront keyboard/focus fixes; `0efa90c8` fixes commerce tenant-graph preflight row identity.
- Do not treat older P0 lane PR heads as the final release candidate; Runtime 7 should validate this convergence branch.

## Application evidence already obtained
The converged application at/around `c630542` was executed locally, not inferred from GitHub CI:
- P0 release contract: **28/28 PASS**.
- Focused order/cart/commerce: **37/37 PASS**.
- TypeScript: **PASS**.
- Full suite: **1,126 tests / 1,124 pass / 2 fail**.
- Remaining two failures are inherited frozen-R4 source-contract failures: admin catch-all heavy-route contract and Beauty compact-mobile discovery contract.
- Migration drift: **PASS**.
- `git diff --check`: **PASS**.
- Scoped ESLint: **0 errors**, one Checkout hooks warning.
- Dependency graph: Next `16.3.5`, Sharp `0.35.4`, nested Sharp deduped/overridden to `0.35.4`.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- Production build completed and a Next `16.3.5` server returned HTTP 200 locally.
- CSP runtime response contained the narrow Firebase/reCAPTCHA allowances while retaining `frame-ancestors 'none'` and `object-src 'none'`.

Because `c5fc7a6` contains two follow-up code/schema fixes after the original `c630542` proof, Runtime 7A (#375) must rerun the final exact-head gate before freeze acceptance.

## Disposable database replay checkpoint
A fresh local PostgreSQL **12** database was created only for migration-chain validation. Production was never mutated.

Repository migration inventory at the checkpoint:
- 161 real ordered migrations.
- 17 registered smoke SQL files are not part of the migration chain.

Replay progress:
- migrations 1–78: PASS;
- historical search migrations 79–81 required **local-only PG12 casts** because PG12 rejects `int4` output for a `numeric` SQL-function record field; production PG17 owns the same numeric-return function over `int4` price columns successfully;
- migrations 82–91: PASS;
- migration 92 required a **local-only PG12 shim** because PG12 does not support view option `security_invoker`; repository SQL was not changed;
- migrations 93–107: PASS;
- migration 108 stops on `ON DELETE SET NULL (order_id)`, another newer PostgreSQL syntax unsupported by PG12.

Read-only production PostgreSQL 17 confirms the exact FK exists as:
`FOREIGN KEY (order_id, store_id) REFERENCES orders(id, store_id) ON DELETE SET NULL (order_id)`.

Therefore these PG12 stops are compatibility evidence, not justification to modify repository migrations. Runtime 7B (#376) must perform the decisive replay on a supported PostgreSQL/Supabase stack matching production major version, with no compatibility edits.

## Runtime-7 execution order
Run/own work through the existing issues; do not create replacement trackers:
1. #375 — exact-head application gate.
2. #376 — supported-stack full migration replay, twice from empty DBs.
3. #377 — complete registered DB smoke pack on the migrated disposable DB.
4. Parallel after #377 where independent: #378 order/payment concurrency, #380 invite/seat race, #381 tenant/RBAC matrix, #382 auth/Firebase/CSP browser proof, #383 storefront accessibility browser proof, #384 recovery/background delivery, #385 analytics/refund/loyalty/merchandising truth.
5. #379 billing/manual-bKash is special: historical duplicate settlement identity needs explicit provider/finance evidence before any production reconciliation write.
6. #386 full merchant/shopper E2E after subsystem gates are green.
7. #387 real provider matrix with authorized sandbox/test credentials only.
8. #388 exact-production deployment/health/short soak only after explicit deployment authorization.
9. #389 final GO / CONDITIONAL-GO / NO-GO.

Existing required runtime gates remain dependencies and must not be duplicated: #14 low-end Android UAT, #122 backup/restore rehearsal, #170 DR drill, #219 release coherence, #221 custom-domain ingress if sold at launch, #367 image-runtime dependency proof.

## Critical unresolved production blocker
#314 historical manual-bKash reconciliation remains non-automatable. Earlier read-only production evidence found one normalized manual-bKash identity represented by two paid invoices in different stores and existing metadata could not truthfully identify the legitimate settlement. Do **not** auto-select a winner. #379 owns the provider/finance evidence and governed reconciliation.

## Safety / ownership rules
- No production DB writes unless explicitly authorized through the production/runtime gate.
- Never point mutation-capable smoke SQL at production.
- Do not rerun GitHub Actions jobs that failed before executing any steps (`runner_id=0`, zero steps).
- Keep frozen R4 template/presentation work separate from release authority except where already composed in the convergence branch.
- Do not resurrect legacy v1/v2 order authority after lifecycle→v3 convergence.
- Unpublished/private stores remain non-transactional regardless of live-plan state.
- Client monetary values remain assertions only; v3/lifecycle owns price, delivery, option, payment and reservation truth.

## New-chat start command
Start by reading this handoff plus issues #320 and #375–#389. Verify the current remote head of `release/r4-p0-convergence-2026-09-15` before doing any write. Treat `c5fc7a6b6f7acea136d2b2f16b7741b88e7d46f4` as the latest implementation checkpoint recorded here; if the branch advanced after this document, inspect those commits first.

Immediate work should be Runtime 7A/7B in parallel: rerun the exact-head application gate on a clean install while preparing a PostgreSQL 17/Supabase-compatible disposable environment for an unmodified full migration replay. Do not continue patching historical migrations merely to satisfy PostgreSQL 12.