# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Exact source checkpoints

- Frozen R4 storefront: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- Coordinator seed: `27a61b369b83c6fd40e3e3fcc2d3dcf9f2cd3a7c` (`release/p0-blocker-coordination-2026-09-14`)
- Commerce/security implementation checkpoint immediately before this manifest refresh: `cca687642a8791c5e25a7edc3b6e72860ff3dd76`
- Last earlier production-preflight-validated commerce checkpoint: `768e82483a97e82d57392a2b41a3d2d2fabb93a2`
- Billing PR #364: `7270899b8f27628bb7b304b2db1fb41cd53e133f`
- Order PR #365: `8846129614ad6bf17633954a2e8d6cc59baf597c`
- Payment PR #366: `42815b160af3e8c6e4e6ce6ff0d3ede76a186d58`
- Invite PR #368: `849abada98722a3b65f915198a46fd42c1f760e5`
- Dependency-security P0: #367 remains open

The branch commit created by updating this document is metadata-only and therefore necessarily newer than the implementation checkpoint above. Use the PR head for the exact post-refresh branch SHA.

## Integration authority

Use coordinator `27a61b3...` as the P0 integration seed. It already contains accepted billing integration plus `scripts/verify-p0-release-contract.mjs`. Final convergence must preserve coordinator/P0 authority, frozen R4 behavior, accepted Invite → Order → Payment follow-ups, this hardening branch, and the isolated #367 dependency patch.

Do not merge a raw P0 branch directly into frozen R4 and call the release complete. `node scripts/verify-p0-release-contract.mjs` is mandatory on the final integrated SHA and must not be weakened to make an older branch candidate pass.

## P0 lane state

### Billing — #308 / #314

Current PR #364 head: `7270899b8...`.

The lane reports its code/database authority contracts and real PostgreSQL proofs complete. Production still has one normalized manual-bKash transaction identity attached to two paid invoices. That historical collision requires finance/provider-authoritative reconciliation before the #314 unique identity migration may be applied. Do not infer or auto-select a winner.

### Order — #309 / #310 / #318

Current PR #365 head: `884612961...`.

The order lane now reports the previously requested follow-ups implemented and validated:
- delivery defaults are non-authoritative/off for new stores;
- primary-zone membership is explicit and server/database-derived from shipping city;
- manual-payment evidence is structured and survives backup/restore;
- stable option IDs plus DB-derived deltas feed `create_store_order_authoritative_v3(...)`;
- focused and full repository tests, typecheck, build, migration execution and PostgreSQL authority smoke are reported green on that lane.

Treat this as the current monetary/order authority candidate for convergence. Final acceptance still occurs only after composing it with Payment and running the coordinator contract on one exact SHA.

### Payment — #317 / #327

Current PR #366 head: `42815b160...`.

The latest commit materially strengthens lifecycle safety:
- release-at-most-once markers prevent repeated inventory/coupon restoration;
- order cancellation is blocked while provider execution is `executing` or `reconciliation_required`;
- a durable succeeded provider attempt prevents creation of a second payment obligation.

However the migration still documents and calls the legacy v2 order-creation boundary. Therefore Payment is **not yet convergence-accepted**. Required final revision remains: lifecycle wrapper → Order lane `create_store_order_authoritative_v3(...)` with the full authoritative delivery/payment/manual-reference/option argument contract, preserving all reservation/execution/reconciliation guards.

### Invite + staff seats — #323 / #325

Current PR #368 head: `849abada98722a3b65f915198a46fd42c1f760e5`.

The latest Invite revision now composes #323 and #325 in the same authority boundary:
- pending staff `role='owner'` is rejected at database authority;
- staff-seat entitlement is resolved at claim time;
- pending invites do not reserve seats;
- owner does not consume a purchasable staff seat;
- negative staff limit remains an explicit unlimited sentinel;
- store-scoped transaction locking serializes last-seat claims;
- direct membership writes share the same authoritative seat/owner guard;
- real PostgreSQL proof reported exactly one winner in a last-seat race, loser invite remaining pending, over-limit direct insert denial, freed-seat reuse, unlimited-plan behavior, and downgrade rejection.

Keep #323/#325 open until integrated rollout/postdeploy verification, but the previously identified owner-role and staff-seat implementation gaps are no longer the lane blocker.

### Dependency security — #367

Still open. The release must not ship the vulnerable Next/Sharp image-optimizer graph. Keep remediation isolated until shared package conflicts converge, then apply the patched Next/Sharp versions, remove/update the nested Sharp override, regenerate the lock once with Node 24/npm 11.17, prove `npm ci`, audit, production build, and local/remote image-optimizer smoke.

## Hardening on this branch after `768e824...`

### #312 — analytics/revenue truth

Order placement persists `order_created` / `order_created_item`, not purchase/settlement truth. Order creation writes no revenue `sale`; cancellation alone writes no fake refund/revenue fact; recovery revenue stays zero until settlement authority. Production read-only inspection found no historical purchase/item-purchase or revenue rows requiring reconciliation.

### #313 — coupon tenant identity

`20260914211000_scope_coupon_codes_per_store.sql` is pending production. Registered rollback-only `store_coupon_scope_smoke.sql` proves two stores may share the same normalized coupon while a same-store duplicate fails. Production currently has zero coupon rows.

### #322 — email/recovery recipient authority

Guest recovery no longer nominates arbitrary automated email/phone recipients; recovery email is bound to authenticated account identity and scheduling is throttled. Deployed `send-email` was verified service/machine-key-only and template-defined. Production has no guest recovery-message reconciliation debt.

### #324 — merchant capability matrix

Pending migrations:
- `20260914233000_store_role_capability_matrix_324.sql`
- `20260914233500_store_role_viewer_read_contract_324.sql`

The branch now separates:
- owner/admin tenant administration;
- editor content/catalog/day-to-day fulfillment work;
- viewer read-only non-sensitive catalog/content review.

Sensitive service-role routes for courier configuration, preview-token issuance, notification retry/escalation and test sends require owner/admin. Order-status and courier-booking fulfillment remain editor-capable. Browser membership mutation is removed. Preview authority, domains, integrations, financial/reconciliation surfaces, publication and sensitive settings are admin-scoped.

Registered proof:
- `supabase/migrations/store_role_capability_matrix_smoke.sql`
- `supabase/tests/store_role_capability_preflight.sql`
- `src/lib/security/store-role-capability-contract.test.ts`

Read-only production preflight found 19 owner memberships and **0 admin/editor/viewer memberships, 0 delegated-owner memberships and 0 pending staff invites**, so no lower-role production reconciliation is currently required. #324 remains open until real post-migration role-matrix proof executes.

### #326 — order-background retry/idempotency

Cart-recovery closure is retry-required before best-effort effects; inline failure is handed to the durable queue. Merchant notification uses a durable pre-send claim. Order-created analytics have DB sink identities and item identity includes option/variant metadata.

Pending migration: `20260914231000_order_background_effect_idempotency.sql`.
Registered smoke/preflight:
- `supabase/migrations/order_background_effect_idempotency_smoke.sql`
- `supabase/tests/order_background_effect_preflight.sql`

### #331 — storefront accessibility contract

The current hardening branch now restores the source-level contract that had been lost when the UX branch rolled storefront experiments back:
- Navbar has keyed dropdown state, focus/hover open, focus-leave/Escape close, focus restoration, `aria-expanded`, `aria-controls`, and `aria-haspopup` while preserving direct link navigation;
- CartDrawer uses the shared Radix-backed `Sheet`;
- ProductImageGallery fullscreen uses the shared Radix-backed `Dialog`, labelled arrow controls, keyboard arrows, touch/focus-visible expansion and visible close control;
- SearchBar implements combobox/listbox IDs, active descendant, selected option semantics, live result status and non-nested history/remove actions;
- shared Sheet/Dialog close controls are 44×44px.

Source contract: `src/lib/storefront-accessibility-contract.test.ts`.

#331 remains open until exact integrated browser proof covers Tab/Shift+Tab, Enter/Space, arrows, Escape, modal focus entry/containment/restoration, 200% zoom/reflow and screen-reader semantics.

### #333 — Firebase phone-auth CSP

Repository CSP narrowly permits required reCAPTCHA/Firebase endpoints while preserving restrictive core directives. Browser OTP proof remains required.

### #334 — durable Firebase external-subject binding

Pending migration: `20260914232000_external_auth_identity_binding_334.sql`.

The Next auth bridge now keys authority by immutable Firebase project + UID, never silently links existing Supabase users by mutable email/phone, never resets a matched Supabase password, persists a server-only binding, and exchanges through a one-time Supabase magic-link token. The old public Edge bridge is a branch 410 tombstone.

Read-only production preflight: 19 auth users and zero legacy `firebase_uid` metadata; no historical identity-link reconciliation is currently required.

Registered proof:
- `supabase/tests/external_auth_identity_preflight.sql`
- `supabase/migrations/external_auth_identity_binding_smoke.sql`
- `src/lib/auth/auth-bridge-identity-authority.test.ts`

### #363 — printable invoice stored-XSS boundary

All dynamic printable invoice fields are HTML-encoded before `document.write`; multiline notes preserve only escaped text plus generated line breaks. Hostile-markup source regressions are present.

## Shared-file merge rules

- `supabase/migration-drift-policy.json`: union all valid pending-production entries.
- `scripts/run-rls-smoke.mjs`: union all accepted billing/invite/order/payment/commerce/security smokes. The new capability-matrix smoke supersedes the obsolete monolithic editor-as-manager role smoke in the runner; cross-tenant smoke remains separate.
- `package.json` / `package-lock.json`: preserve coordinator scripts and apply #367 last; regenerate the final lock once.
- `src/integrations/supabase/types.ts`: regenerate/reconcile only from the complete final schema.
- Order conflicts: v3 monetary/option/delivery/payment authority wins; reapply non-conflicting request/cart/publication hardening around it.
- Payment conflicts: lifecycle owns provider execution/reservation/release, but must call accepted v3 rather than restoring v2.
- Invite conflicts: Invite head owns atomic claim, owner-role rejection and staff-seat authority. Preserve commerce RBAC membership revocation/role policy without creating a second membership authority.

## Migration order

Preserve the non-colliding sequence:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order authority → `14203000` payment lifecycle → `14205500` storefront manual-payment replay → `14211000` coupon scope → `14212000` cart quantity → `14213000` product tenant consistency → `14213500` direct-order mutation lock → `14214000` owned-reference consistency → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery-message authority → `14224000` recovery-touch dedupe → `14225000` coupon privacy → `14225500` function search paths → `14231000` order-background idempotency → `14232000` external auth binding → `14233000` role capability matrix → `14233500` viewer-read/preview authority.

Do not renumber an already-pushed migration unless an actual pre-rollout collision is found.

## Required Runtime-7 / rollout gates

Before production migration/deploy:

- exact integrated SHA + clean tree recorded;
- coordinator `verify-p0-release-contract.mjs` PASS;
- Node 24/npm 11.17 clean `npm ci`;
- typecheck, complete suite, lint, diff-check and production build;
- migration drift guard;
- every relevant read-only preflight and registered rollback-only DB smoke;
- Order v3 adversarial matrix with non-zero option delta and delivery/payment/manual-reference tamper cases;
- Payment lifecycle composed onto v3, plus abandonment/retry/cancel, execute concurrency, unresolved reconciliation and release-at-most-once proof;
- Billing preflight/postdeploy after the one #314 historical duplicate is finance-authoritatively reconciled;
- Invite atomicity, owner-role rejection and last-seat race proof on the integrated schema;
- #324 owner/admin/editor/viewer/cross-store real-RLS matrix;
- direct-order mutation negative proof;
- duplicate manual-payment negative proof;
- two-store/same-coupon positive proof + public coupon-enumeration negative proof;
- recovery arbitrary-recipient negative + authenticated-email positive proof;
- duplicate background-delivery proof;
- real browser #331 keyboard/focus/zoom/AT verification;
- production-like Firebase phone OTP with no CSP violation;
- Firebase same-UID reuse/collision negatives and retired Edge bridge proof;
- hostile invoice fields render literally in a print window;
- #367 `npm audit`, build and image-optimizer smoke.

During cutover, apply the accepted schema and matching app/Edge code together, prove every app instance uses lifecycle → v3, then retire service-role execution of superseded v1/v2 order creation before reopening checkout. Refresh `supabase/production-migration-ledger.json` only after observing production migrations and remove only the corresponding `pending-production` exceptions.

## Validation truth

Earlier commerce checkpoint `e5c3547...` completed 1,030 tests with 1,028 pass / 2 inherited frozen-R4 failures; focused commerce suites, typecheck, scoped lint, diff-check and migration drift were green. The earlier read-only production preflight at `768e824...` also passed.

The current implementation checkpoint `cca687642a8791c5e25a7edc3b6e72860ff3dd76` has **no hosted execution evidence**. Its GitHub Quality Gate job completed in roughly three seconds with `steps=[]`, `runner_id=0`; therefore no checkout, test, typecheck, lint, audit or build command ran. Database/Preview/Secret workflows are likewise red at the workflow level and must not be interpreted as application-test failures or successes until a runner actually executes steps.

No production mutation has been performed by this hardening lane.

## Release decision

**NO-GO / SAFE TO INTEGRATE AS-IS: NO.**

The largest convergence delta has narrowed: Order and Invite now contain the requested authority follow-ups, while Payment still must compose its lifecycle wrapper onto v3. Release remains blocked by that composition, the historical #314 reconciliation, #367 dependency remediation, unexecuted newest hardening/RBAC/accessibility/auth code, unapplied governed migrations, and final Runtime-7 cross-domain proof on one exact integrated SHA.
