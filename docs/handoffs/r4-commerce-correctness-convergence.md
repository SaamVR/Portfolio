# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Exact heads

- Frozen R4 storefront: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- Coordinator seed: `27a61b369b83c6fd40e3e3fcc2d3dcf9f2cd3a7c` (`release/p0-blocker-coordination-2026-09-14`)
- Commerce/security hardening head at this snapshot: `51e259d9f44fa61d2e9152a2e7430e4ce4f21826`
- Last production-preflight-validated earlier rollout checkpoint: `768e82483a97e82d57392a2b41a3d2d2fabb93a2`
- Billing PR #364: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7`
- Order PR #365: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a`
- Payment PR #366: `f2b50c2bc8e892e593cffbf654fad8d7b011d400`
- Invite PR #368: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26`
- Dependency-security P0: #367

## Integration authority

Use coordinator `27a61b3...` as the P0 seed. It already contains accepted billing integration plus `scripts/verify-p0-release-contract.mjs`. Final convergence must preserve coordinator/P0 authority, frozen R4 storefront behavior, accepted Invite → Order → Payment follow-ups, this hardening branch, and the isolated #367 dependency patch.

Do not merge a raw P0 branch directly into frozen R4 and treat it as release-complete. `node scripts/verify-p0-release-contract.mjs` is mandatory on the exact integrated SHA and must not be weakened to make older candidates pass.

## P0 acceptance state

### Billing — #308 / #314

Head `e1ee505...`. Code/database authority is already represented on coordinator lineage. Production closure remains blocked by one historical normalized manual-bKash identity attached to two paid invoices. Finance/provider evidence must resolve it before #314 uniqueness rollout; do not infer a winner.

### Order — #309 / #310 / #318

Head `5cf4db3...`, Draft PR #365. Still needs coordinator-required safe first-store delivery defaults, structured primary-zone/manual-payment evidence with backup round-trip, and exact accepted v3 proof. Stable option IDs + DB-derived deltas remain canonical monetary authority.

### Payment — #317 / #327

Head `f2b50c2...`, Draft PR #366. Current core migration still calls legacy v2. Acceptance requires lifecycle → accepted v3, durable release-at-most-once state, unresolved-provider release blocking, and terminal-success replay protection.

### Invite — #323 + #325 composition

Head `a1fedb9...`, Draft PR #368. Atomic claim work is strong but DB authority must reject staff `role='owner'`. #325 staff-seat enforcement belongs in this same transaction: take a store-scoped transaction lock, resolve canonical `feature_flags.staff`, count active non-owner staff at claim time, leave pending invites non-reserving, return stable capacity failure without consuming the invite, and prove the last-seat race. Direct membership writes must not bypass the same entitlement boundary.

### Dependency security — #367

Keep isolated until convergence. Upgrade patched Next/Sharp graph, regenerate the final lock with Node 24/npm 11.17, prove `npm ci`, audit/build and image-optimizer smoke.

## Hardening added after `768e824...`

### #312 — analytics/revenue truth

Order placement persists `order_created` / `order_created_item`, not purchase/settlement truth. Order creation writes no revenue `sale`; cancellation alone writes no refund/revenue fact; recovery revenue stays zero until settlement authority. Queue payloads are normalized before enqueue and persistence. Production read-only inspection found zero historical purchase/item purchase events and zero revenue rows requiring reconciliation.

### #313 — coupon tenant identity

`20260914211000_scope_coupon_codes_per_store.sql` remains pending production. `store_coupon_scope_smoke.sql` is registered and rollback-only: two stores can own the same normalized code; a same-store duplicate must fail. Production currently has zero coupon rows.

### #322 — email/recovery recipient authority

Deployed `send-email` v8 was verified service/machine-key-only and template-defined. Guest recovery can persist cart state but cannot nominate an arbitrary automated email/phone recipient. Automated recovery email is bound to authenticated account email, scheduling is throttled, and order-phone matching falls back to authenticated email. Production has zero guest recovery messages/leads requiring cleanup.

### #326 — order-background retry/idempotency

Cart-recovery closure is retry-required and executes before best-effort effects. Inline failure is handed to the durable queue using the same idempotent order key; queue consumers rethrow retry-required failures. Merchant notification uses a durable pre-send claim. Order-created analytics have DB sink identities; item identity includes option/variant metadata. Cancellation has no fabricated financial side effect.

Pending migration: `20260914231000_order_background_effect_idempotency.sql`.
Registered proof:
- `supabase/migrations/order_background_effect_idempotency_smoke.sql`
- `supabase/tests/order_background_effect_preflight.sql`

Read-only production preflight found no duplicate/reconciliation blocker.

### #333 — Firebase phone-auth CSP

Repository CSP now narrowly allows documented reCAPTCHA script/frame/connect origins, Firebase Identity Toolkit, Secure Token, and only the validated configured Firebase auth-domain origin. `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, and non-wildcard script/connect policy remain intact. Browser OTP proof remains required.

### #334 — durable Firebase external-subject binding

Pending migration: `20260914232000_external_auth_identity_binding_334.sql`.

The Next `/api/auth-bridge` now:
- verifies Firebase token then keys authority by immutable Firebase project + `localId`;
- accepts email only when Firebase marks it verified;
- never searches existing Supabase users by mutable email/phone;
- returns `identity_link_required` on an unbound collision rather than silently merging;
- persists a service-role-only binding in `external_auth_identities`;
- issues a one-time Supabase session with admin `generateLink(type='magiclink')` + `verifyOtp(token_hash)` and verifies the returned user ID;
- never resets the matched Supabase password or calls `signInWithPassword`.

The legacy public Supabase `auth-bridge` function is a 410 fail-closed tombstone on the branch so final deployment has one exchange authority.

Read-only production preflight: 19 auth users, 0 users carrying legacy `firebase_uid`, and no binding table yet. Deployed Edge v12 remains legacy/vulnerable until coordinated rollout.

Registered proof:
- `supabase/tests/external_auth_identity_preflight.sql`
- `supabase/migrations/external_auth_identity_binding_smoke.sql`
- `src/lib/auth/auth-bridge-identity-authority.test.ts`

### #363 — printable admin invoice stored-XSS boundary

All dynamic printable invoice text is HTML-encoded before `document.write`, including merchant/store name, order/customer/shipping fields, product names/options, and notes/TrxID. Multiline notes preserve only escaped text plus generated `<br>` separators. Hostile-markup regressions cover script/event-handler payloads.

## Shared-file merge rules

- `supabase/migration-drift-policy.json`: union every valid pending-production exception; do not drop sibling-lane entries.
- `scripts/run-rls-smoke.mjs`: union all billing/invite/order/payment/commerce/security smokes, including coupon scope, order-background idempotency and external-auth binding.
- `package.json` / `package-lock.json`: preserve all coordinator scripts; apply #367 last; regenerate final lockfile once.
- `src/integrations/supabase/types.ts`: regenerate/reconcile from final schema.
- Order/checkout conflicts: P0 order authority wins for monetary/variant/delivery/payment truth; reapply non-conflicting request/cart/publication hardening around it.
- Payment lifecycle conflicts: Payment lane owns provider execution/reservation/release; commerce manual-reference claims remain manual-payment replay authority only.
- Invite conflicts: Invite lane owns atomic claim/grant and must absorb #325 seat authority.

## Migration order

Preserve the current non-colliding sequence:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order authority → `14203000` payment lifecycle → `14205500` storefront manual-payment replay → `14211000` coupon scope → `14212000` cart quantity → `14213000` product tenant consistency → `14213500` direct-order mutation lock → `14214000` owned-reference consistency → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery-message authority → `14224000` recovery-touch dedupe → `14225000` coupon privacy → `14225500` function search paths → `14231000` order-background idempotency → `14232000` external auth identity binding.

Do not renumber an already-pushed migration unless a real collision appears before rollout.

## Required Runtime-7 / rollout gates

Before production migration/deploy:

- exact integration SHA + clean tree recorded;
- coordinator P0 contract PASS;
- Node 24/npm 11.17 `npm ci`, typecheck, complete suite, lint, `git diff --check`, production build;
- migration drift guard;
- commerce, order-background and external-auth preflights;
- every registered DB smoke;
- v3 adversarial matrix with non-zero option delta;
- delivery city/zone tamper proof;
- structured manual-payment + replay-ledger + backup/restore proof;
- payment abandonment/retry/cancel + bKash concurrency/release proof;
- billing preflight/postdeploy after #314 reconciliation;
- invite atomicity + owner-role rejection + #325 last-seat race;
- direct-order mutation negative proof;
- duplicate manual-payment negative proof;
- two-store/same-coupon positive proof + public coupon-enumeration negative proof;
- recovery arbitrary-recipient negative + authenticated-email positive proof;
- duplicate order-background delivery proof;
- production-like Firebase phone OTP with no CSP violation;
- Firebase same-UID reuse, unverified/collision negative proof, no Supabase password mutation, and retired Edge function proof;
- hostile persisted invoice fields render literally in the print window;
- #367 audit/build/image-optimizer smoke.

During order cutover, deploy matching app/schema together, prove every app instance uses lifecycle-wrapper → v3, then revoke/retire service-role execution of superseded v1/v2 before reopening checkout. Refresh `supabase/production-migration-ledger.json` after deployment and remove only the `pending-production` exceptions actually observed in production.

## Validation truth

Earlier commerce checkpoint `e5c3547...` completed 1,030 tests with 1,028 pass / 2 inherited frozen-R4 failures; focused commerce suites, typecheck, scoped lint, diff-check and migration drift were green. The earlier version-controlled production preflight at `768e824...` also passed read-only.

On later exact head `e2d31f0...`, hosted Quality Gate and Database Smoke jobs were inspected and completed with `steps=null`; no checkout, test, typecheck, SQL or build step executed. The newer #313/#333/#334/#363 commits therefore have **no hosted-CI execution evidence yet**. Do not infer pass/fail from the red workflow badges.

No production mutation has been performed by this hardening lane.

## Release decision

**NO-GO.** Runtime 7 remains incomplete until outstanding P0 revisions are accepted, #314 historical reconciliation and #367 are resolved, all lineages converge on one exact SHA, the newest hardening code executes through real tests/smokes, governed migrations + app/Edge deployment pass postdeploy verification, and the final cross-domain regression runs against that exact integrated SHA.
