# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Exact current heads

- Frozen R4 storefront: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- P0 coordinator seed: `27a61b369b83c6fd40e3e3fcc2d3dcf9f2cd3a7c` (`release/p0-blocker-coordination-2026-09-14`)
- Commerce branch: `e2d31f0760ca13f04e561e5d810b89e7fbbb9dbb`
- Last production-preflight-validated schema/rollout checkpoint before the latest forward-only app hardening: `768e82483a97e82d57392a2b41a3d2d2fabb93a2`
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

## Current P0 lane acceptance state

### Billing — #308 / #314

Head: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7`.

Code/database contracts are strong and earlier accepted billing work is already on the coordinator lineage. Production closure remains blocked by one historical normalized manual-bKash identity attached to two paid invoices. External finance/provider evidence is required before the #314 uniqueness migration can be applied; do not auto-delete, auto-refund or infer a winner.

### Order — #309 / #310 / #318

Head: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a`; Draft PR #365.

Still not Runtime-7 accepted. Current pushed candidate still needs the coordinator-required safe first-store delivery default, final structured primary-zone membership/manual-payment evidence + backup round-trip contract, and exact accepted v3 proof. Stable option IDs/DB-derived deltas remain the canonical monetary model once those follow-ups land.

### Payment — #317 / #327

Head: `f2b50c2bc8e892e593cffbf654fad8d7b011d400`; Draft PR #366.

The current pushed head strengthens tests/smoke but the core migration still calls legacy `create_store_order_with_stock_v2`. Required revision remains lifecycle → accepted `create_store_order_authoritative_v3`, durable release-at-most-once state, provider unresolved-state release blocking, and terminal-success replay protection.

### Invite — #323

Head: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26`; Draft PR #368.

Atomicity/concurrency/rollback behavior is strong, but a merchant-authored staff invite with `role='owner'` is still not rejected at DB claim authority. Add the explicit DB guard/constraint plus negative real-DB regression before acceptance.

### Dependency security — #367

Keep this patch isolated and apply after shared package/script conflicts converge. Upgrade Next/Sharp to patched versions, regenerate the lockfile with Node 24/npm 11.17, prove `npm ci`, clear the vulnerable graph, and pass build + image-optimizer smoke.

## Latest commerce hardening delta after `768e824...`

The commerce branch now additionally contains forward-only P1 closure work:

### #312 — analytics/revenue truth

- order placement is normalized to `order_created` / `order_created_item`, not `purchase` / `purchase_item`;
- order creation no longer writes `store_revenue_events.sale`;
- cancellation alone no longer fabricates refund/revenue truth;
- cart-recovery `recovered_revenue` remains zero until settlement authority exists;
- queue payloads are normalized before enqueue and again before persistence.

Read-only production aggregate inspection found zero existing `purchase`/`purchase_item` rows and zero `store_revenue_events`, so there is no historical reconciliation debt for this change.

### #322 — email/recovery recipient authority

- deployed `send-email` v8 was verified read-only as service/machine-key-only and template-defined; the original authenticated-member arbitrary email relay is no longer live;
- guest abandoned carts may still persist cart state, but cannot nominate an arbitrary email/phone recipient for automated recovery;
- automated recovery email is bound to the authenticated account email;
- contact scheduling has a bounded store+user throttle;
- recovery matching falls back from order phone to authenticated email so the security hardening does not strand legitimate signed-in leads.

Read-only production inspection found zero guest recovery leads/messages requiring cleanup.

### #326 — order-background retry/idempotency authority

- cart-recovery closure is explicitly retry-required and runs before best-effort side effects;
- inline retry-required failure is handed to the durable queue with the same idempotent order-created key;
- queue consumer rethrows retry-required failures rather than acknowledging them;
- merchant order notification uses a durable pre-send claim so duplicate queue delivery cannot resend the provider notification;
- order-created analytics use DB-enforced sink identities and duplicate-key delivery becomes a no-op;
- item analytics identity includes option/variant metadata so two distinct variants of the same product are not collapsed;
- cancellation runner has no fabricated financial side effect after #312.

New pending migration:
`20260914231000_order_background_effect_idempotency.sql`

New registered smoke/preflight:
- `supabase/migrations/order_background_effect_idempotency_smoke.sql`
- `supabase/tests/order_background_effect_preflight.sql`

The revised read-only production preflight completes without a duplicate/reconciliation blocker.

## Semantic integration order

Starting from coordinator `27a61b3...`:

1. Invite follow-up after owner-role guard is accepted.
2. Order follow-up after delivery/manual-evidence/backup/v3 contracts are accepted.
3. Payment follow-up after lifecycle→v3 and durable release/provider-state guards are accepted.
4. Reconcile frozen R4 + commerce by hand on shared storefront/order/cart files; do not wholesale choose one side.
5. Preserve all non-conflicting commerce hardening, including the #312/#322/#326 forward-only additions.
6. Apply #367 last and regenerate the final lockfile exactly once.

Billing is already integrated into the coordinator seed, but #314 cannot be production-closed until historical finance reconciliation is complete.

## Conflict ownership

### Order / checkout / product selection

Order-authority semantics win for monetary truth: stable commercial option IDs, authoritative deltas, payment availability, delivery authority and v3 creation. Reapply commerce hardening around that core: bounded/malformed request handling, publication gate, guest policy, authenticated-email derivation, cart normalization, stale/unavailable product fail-closed behavior.

Do not retain the old commerce free-form option-label validator where it competes with #318 stable IDs.

### Manual storefront payment

Order authority owns structured `manual_payment_provider` / `manual_payment_reference`; commerce owns durable provider+reference replay claims. Final integration uses one bounded opaque reference grammar in HTTP input, v3 constraints, stored order fields, replay ledger and tests. Notes parsing is historical backfill only. Backup/restore must preserve evidence without cloning a second settlement claim.

### Payment lifecycle

Payment lane owns reservation lease/release, attempt/execution claim, provider-result reconciliation and terminal-state semantics after it composes around v3. Commerce manual bKash/Nagad claim ledger is for manual payment references only and must never replace automated bKash execution authority.

### Billing

Coordinator-integrated billing route/migration/reviewer semantics win. Preserve smoke/drift registrations from all lanes. Never apply #314 uniqueness before historical duplicate reconciliation.

### Invite

Invite lane owns atomic claim/grant after owner-role guard lands. Reconcile/regenerate final Supabase types after the complete migration set.

### Shared files

- `supabase/migration-drift-policy.json`: union every valid pending-production exception.
- `scripts/run-rls-smoke.mjs`: union every registered billing/invite/order/payment/commerce smoke, including `order_background_effect_idempotency_smoke.sql`.
- `package.json`: preserve all coordinator/billing/invite scripts, then apply #367 dependency changes.
- `package-lock.json`: regenerate once from final package graph; never resolve by taking one branch wholesale.
- `src/integrations/supabase/types.ts`: regenerate/reconcile from final schema.
- `src/lib/storefront-commercial-truth.test.ts`: combine truth assertions rather than deleting one side.

## Migration order

Preserve the current non-colliding sequence:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order authority → `14203000` payment lifecycle → `14205500` storefront manual-payment replay → `14211000` coupon scope → `14212000` cart quantity → `14213000` product tenant consistency → `14213500` direct-order mutation lock → `14214000` owned-reference consistency → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery-message authority → `14224000` recovery-touch dedupe → `14225000` coupon privacy → `14225500` function search paths → `14231000` order-background effect idempotency.

Do not renumber an already-pushed migration unless a real collision appears before production rollout.

## Required final gates

Before production migration/deploy:

- exact integration SHA + clean tree recorded;
- coordinator `verify-p0-release-contract.mjs`: PASS;
- Node 24/npm 11.17 `npm ci`;
- typecheck, complete test suite, ESLint, `git diff --check`, production build;
- migration drift guard;
- `supabase/tests/commerce_hardening_preflight.sql` and `supabase/tests/order_background_effect_preflight.sql`;
- every registered DB smoke, including order-background idempotency smoke;
- v3 authoritative order adversarial matrix including non-zero option delta;
- first-store delivery default + city tamper proof;
- structured manual-payment + replay-ledger + backup/restore proof;
- payment abandonment/retry/cancel + bKash concurrency + durable release proof;
- billing preflight/postdeploy after historical reconciliation;
- invite atomicity + owner-role rejection proof;
- direct-order mutation negative proof;
- manual-payment duplicate-reference negative proof;
- two-store/same-coupon positive proof + public coupon enumeration negative proof;
- recovery arbitrary-recipient negative proof + authenticated-email positive proof;
- recovery duplicate-touch/direct-mutation negative proof;
- duplicate order-background delivery proof for analytics + merchant notification;
- #367 `npm audit` and image-optimizer smoke.

Production currently exposes legacy `create_store_order_with_stock` / `_v2` only to `service_role`; anon/authenticated are denied. During cutover, apply accepted migrations and deploy matching app/Edge code, prove every app instance uses lifecycle-wrapper → v3, then revoke/retire service-role execution of superseded v1/v2 before reopening checkout.

After deployment, refresh `supabase/production-migration-ledger.json` and remove `pending-production` drift exceptions only for migrations actually observed in production.

## Validation state

Earlier validated commerce checkpoint `e5c3547...` completed 1,030 tests with 1,028 pass / 2 inherited frozen-R4 failures; focused commerce suites, typecheck, scoped lint, diff-check and migration drift were green. The version-controlled read-only commerce preflight at `768e824...` executed successfully against production.

For exact current commerce head `e2d31f0760ca13f04e561e5d810b89e7fbbb9dbb`, GitHub created Quality Gate, Database Smoke, Preview Smoke and Secret Scan runs, but the inspected Quality Gate and Database Smoke jobs both completed with `steps=null`: no checkout, test, typecheck, SQL smoke or build step executed. Treat these red checks as account/runner infrastructure evidence, not code-test evidence. Do not claim the newest #312/#322/#326 commits are hosted-CI validated until real steps run.

No production mutation has been performed by this commerce lane.

## Release decision

**NO-GO.** Do not mark Runtime 7 complete until the exact outstanding P0 follow-ups are accepted, #314 historical reconciliation is completed, #367 is fixed, frozen R4 and coordinator/P0/commerce lineages converge on one exact SHA, the newest commerce commits execute through real tests/smokes, governed migrations/postdeploy smokes pass, and the full Runtime-7 cross-domain regression is rerun against that exact integrated SHA.
