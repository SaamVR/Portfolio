# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Exact current heads

- Frozen R4 storefront: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- P0 coordinator seed: `27a61b369b83c6fd40e3e3fcc2d3dcf9f2cd3a7c` (`release/p0-blocker-coordination-2026-09-14`)
- Commerce branch: `b67faa86f01dc0eb08f613c1b8cb41062c3c3cfa`
- Last production-preflight-validated commerce rollout checkpoint: `768e82483a97e82d57392a2b41a3d2d2fabb93a2`
- Billing: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7` — PR #364
- Order: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a` — PR #365
- Payment: `f2b50c2bc8e892e593cffbf654fad8d7b011d400` — PR #366
- Invite: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26` — PR #368
- Dependency-security blocker: #367

## Integration seed and authority

Use coordinator `27a61b3...` as the P0 integration seed. It already contains accepted billing-authority integration and `scripts/verify-p0-release-contract.mjs`. Do not rebuild that accepted billing work from the raw production baseline unless coordinator history is intentionally abandoned and fully revalidated.

Final release convergence must preserve all of:

1. accepted coordinator/P0 production-lineage authority;
2. exact frozen R4 storefront behavior/content;
3. accepted Invite → Order → Payment follow-up revisions;
4. commerce hardening;
5. the isolated #367 dependency patch.

Do not merge any raw P0 branch directly into frozen R4 and call the release complete.

## Coordinator executable contract

`node scripts/verify-p0-release-contract.mjs` is a mandatory post-composition gate. Do not weaken it to make old branch candidates pass. It verifies:

- authoritative v3 order creation exists;
- structured machine-verifiable primary delivery-zone membership exists;
- structured manual-payment evidence exists and survives operational backup/restore;
- lifecycle wraps authoritative v3 and no runtime v2 path remains;
- new-store delivery defaults are non-authoritative (`deliveryEnabled: false`);
- R4 manual-payment replay claims consume structured references for new orders and do not parse live notes;
- one canonical manual-reference grammar is used;
- cancellation has durable release-at-most-once protection;
- unresolved provider execution/reconciliation blocks resource release;
- terminal successful payment prevents a second executable payment obligation;
- invite claim is atomic/service-role-only and a staff `owner` invite cannot grant owner authority;
- every P0 migration is correctly classified in migration drift.

## Current lane acceptance state

### Billing — #308 / #314

Head: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7`.

The code package is strong and earlier accepted billing work is already on the coordinator lineage. Production closure is still blocked by one historical normalized manual-bKash identity attached to two paid invoices in different stores. Existing DB review metadata is insufficient to choose a legitimate winner automatically.

Required before #314 rollout: preserve both histories, preserve the original duplicate in audit/reconciliation history, use external finance/provider evidence to identify the canonical owner, tombstone/supersede only the other active identity traceably, rerun preflight, then apply/postverify. Do not auto-delete, auto-refund, or infer the winner.

### Order — #309 / #310 / #318

Head: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a`.

Not Runtime-7 accepted. Exact source reinspection still shows:

- Merchant registration defaults `deliveryEnabled: true`; first-store delivery must remain disabled/unconfigured until merchant confirmation.
- Pushed order migration lacks the final structured primary-zone membership contract required by #309.
- Pushed order migration lacks final structured `manual_payment_provider` / `manual_payment_reference` authority required by #310.
- Operational backup/restore does not yet preserve those structured manual-payment fields.
- #318 still needs final rollback-only v3 DB proof including authoritative non-zero option delta, stale/tampered option IDs, delivery/payment rejection and idempotent replay.

Order monetary semantics remain canonical when this follow-up lands: stable option identity, DB-derived price deltas, payment eligibility, delivery authority and v3 order creation.

### Payment — #317 / #327

Head: `f2b50c2bc8e892e593cffbf654fad8d7b011d400`.

This head is one commit ahead of the original `23b1d6e...` candidate, but that new commit changes only the handoff, contract test and SQL smoke. The core `20260914203000_payment_reservation_lifecycle_317_327.sql` blob is unchanged and still calls legacy `create_store_order_with_stock_v2`.

Therefore the source-level Runtime-7 blocker remains despite stronger 45/45 focused tests and PostgreSQL smoke reported in PR #366.

Required revision:

- lifecycle wrapper must call accepted `create_store_order_authoritative_v3`, never v2;
- resource release must use durable already-released state, not merely status-transition history;
- `executing` / `reconciliation_required` attempts must block cancellation/release while provider truth is unresolved;
- safe pre-execute attempts may be terminalized consistently before release;
- a prior `succeeded` attempt must prevent a new executable payment obligation even after order-state tampering/reset;
- regressions must cover cancel → state mutation/reopen → cancel, cancellation racing execute/reconciliation, and succeeded-attempt replay/tamper.

### Invite — #323

Head: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26`; Draft PR #368.

Atomicity/concurrency/rollback behavior is strong, but DB/claim authority still inserts `v_claimed_store.role` into membership without rejecting `role='owner'`. Add a constraint and/or explicit claim guard plus source + real-DB negative regression. Existing legitimate owner membership semantics must remain untouched.

### Dependency security — #367

Keep this patch isolated and apply after shared package/script conflicts converge. Upgrade Next/Sharp to patched versions, remove/update the nested Sharp override, regenerate `package-lock.json` using Node 24/npm 11.17, prove `npm ci` recreates the secure graph, clear Next/Sharp high/critical audit findings, then pass typecheck/full suite/build and local+allowed-remote image-optimizer smoke.

## Semantic integration order

Starting from coordinator `27a61b3...`:

1. Invite follow-up after owner-role guard is accepted.
2. Order follow-up after delivery/manual-evidence/backup/v3-smoke contracts are accepted.
3. Payment follow-up after lifecycle→v3 and durable release/provider-state guards are accepted.
4. Reconcile frozen R4 + commerce by hand on shared storefront/order/cart files; do not wholesale choose one side.
5. Preserve all non-conflicting commerce hardening from validated checkpoint `768e824...` plus later docs/smoke-only commits.
6. Apply #367 last and regenerate the final lockfile exactly once.

Billing is already integrated into the coordinator seed, but #314 cannot be production-closed until historical finance reconciliation is complete.

## Conflict ownership

### Order / checkout / product selection

Order-authority semantics win for monetary truth: stable commercial option IDs, authoritative deltas, payment availability, delivery authority and v3 creation. Reapply commerce hardening around that core: bounded/malformed request handling, publication gate, guest policy, authenticated-email derivation, cart normalization, stale/unavailable product fail-closed behavior.

Do not retain the old commerce free-form option-label validator where it competes with #318 stable IDs.

### Manual storefront payment

Order authority owns structured `manual_payment_provider` / `manual_payment_reference`; commerce owns durable provider+reference replay claims. Final integration uses one bounded opaque reference grammar in HTTP input, v3 constraints, stored order fields, replay ledger and tests. Live replay trigger consumes the structured field. Notes parsing is historical backfill only. Backup/restore must preserve evidence without cloning a second settlement claim.

### Payment lifecycle

Payment lane owns reservation lease/release, attempt/execution claim, provider-result reconciliation and terminal-state semantics after it composes around v3. Commerce manual bKash/Nagad claim ledger is for manual payment references only and must never replace automated bKash execution authority.

### Billing

Coordinator-integrated billing route/migration/reviewer semantics win. Preserve smoke/drift registrations from all lanes. Never apply #314 uniqueness before historical duplicate reconciliation.

### Invite

Invite lane owns atomic claim/grant after owner-role guard lands. Reconcile/regenerate final Supabase types after the complete migration set.

### Shared files

- `supabase/migration-drift-policy.json`: union every valid pending-production exception.
- `scripts/run-rls-smoke.mjs`: union every registered billing/invite/order/payment/commerce smoke.
- `package.json`: preserve all coordinator/billing/invite scripts, then apply #367 dependency changes.
- `package-lock.json`: regenerate once from final package graph; never resolve by taking one branch wholesale.
- `src/integrations/supabase/types.ts`: regenerate/reconcile from final schema.
- `src/lib/storefront-commercial-truth.test.ts`: combine truth assertions rather than deleting one side.

## Migration order

Preserve the current non-colliding sequence:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order authority → `14203000` payment lifecycle → `14205500` storefront manual-payment replay → `14211000` coupon scope → `14212000` cart quantity → `14213000` product tenant consistency → `14213500` direct-order mutation lock → `14214000` owned-reference consistency → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery-message authority → `14224000` recovery-touch dedupe → `14225000` coupon privacy → `14225500` function search paths.

Do not renumber an already-pushed migration unless a real collision appears before production rollout.

## Required final gates

Before production migration/deploy:

- exact integration SHA + clean tree recorded;
- coordinator `verify-p0-release-contract.mjs`: PASS;
- Node 24/npm 11.17 `npm ci`;
- typecheck, complete test suite, ESLint, `git diff --check`, production build;
- migration drift guard;
- version-controlled commerce preflight `supabase/tests/commerce_hardening_preflight.sql`;
- every registered DB preflight/smoke;
- v3 authoritative order adversarial matrix including non-zero option delta;
- first-store delivery default + city tamper proof;
- structured manual-payment + replay-ledger + backup/restore proof;
- payment abandonment/retry/cancel + bKash concurrency + durable release proof;
- billing preflight/postdeploy after historical reconciliation;
- invite atomicity + owner-role rejection proof;
- direct-order mutation negative proof;
- manual-payment duplicate-reference negative proof;
- two-store/same-coupon positive proof + public coupon enumeration negative proof;
- recovery duplicate-touch/direct-mutation negative proof;
- #367 `npm audit` and image-optimizer smoke.

Production currently exposes legacy `create_store_order_with_stock` / `_v2` only to `service_role`; anon/authenticated are denied. During cutover, apply the accepted migrations and deploy the matching app/Edge code, prove every app instance uses lifecycle-wrapper → v3, then revoke/retire service-role execution of superseded v1/v2 before reopening checkout.

After deployment, refresh `supabase/production-migration-ledger.json` and remove `pending-production` drift exceptions only for migrations actually observed in production.

## Commerce validation state

Commerce head `e5c3547...` completed 1,030 tests with 1,028 pass / 2 inherited frozen-R4 failures. Commerce-focused suites, typecheck, lint, diff-check and drift were green before later migration/docs/smoke/preflight-only commits.

The version-controlled read-only commerce preflight at `768e824...` has executed successfully against production with no reconciliation blocker and no production mutation. Function search-path metadata assumptions were also checked against production PostgreSQL `proconfig` representation; the search-path migration remains pending production.

Hosted GitHub Actions remain account/runner-blocked before allocation (`runner_id=0`, no runner name, zero steps). Red zero-step workflow checks are infrastructure evidence, not code-test evidence.

## Release decision

**NO-GO.** Do not mark Runtime 7 complete until the exact outstanding P0 follow-ups above are pushed and accepted, #314 historical reconciliation is completed, #367 is fixed, frozen R4 and coordinator/P0/commerce lineages converge on one exact SHA, governed migrations/postdeploy smokes pass, and the full Runtime-7 cross-domain regression is rerun against that exact integrated SHA.
