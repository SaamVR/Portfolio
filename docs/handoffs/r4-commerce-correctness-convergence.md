# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Exact source checkpoints

- Frozen R4 storefront: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- P0 coordinator remote checkpoint inspected: `2a4ab729989c3cf9739c62572aa465ba4a4ad03e` (`release/p0-blocker-coordination-2026-09-14`)
- Commerce/security runtime implementation checkpoint: `d1487b64965fa0b1ad273f7f1b7e117653408f92`
- Last earlier production-preflight-validated commerce checkpoint: `768e82483a97e82d57392a2b41a3d2d2fabb93a2`
- Billing PR #364: `7270899b8f27628bb7b304b2db1fb41cd53e133f`
- Order PR #365: `8846129614ad6bf17633954a2e8d6cc59baf597c`
- Payment PR #366: `42815b160af3e8c6e4e6ce6ff0d3ede76a186d58`
- Invite PR #368: `849abada98722a3b65f915198a46fd42c1f760e5`
- Dependency-security P0: #367 remains open

Commits after `d1487b6...` only refresh this convergence document; they do not change runtime code or executable regression tests.

## Integration authority

Final release convergence must preserve five independent contracts at once:

1. accepted Billing authority;
2. Invite atomic claim + staff-seat authority;
3. Order v3 monetary/delivery/payment/option authority;
4. Payment reservation/provider lifecycle wrapped around Order v3;
5. the R4 commerce/security hardening contracts on this branch.

Do not resolve overlapping files wholesale from any lane. `node scripts/verify-p0-release-contract.mjs` is mandatory on the exact final integrated SHA and must not be weakened to accept a stale candidate.

## P0 lane state

### Billing — #308 / #314

PR #364 head `7270899b8...` has strong code/database proof. Production still contains one normalized manual-bKash transaction identity attached to two paid invoices. Finance/provider-authoritative reconciliation is required before the #314 unique-identity migration may be applied. Do not infer a winner.

### Order — #309 / #310 / #318

PR #365 head `884612961...` contains the current v3 monetary authority candidate:
- explicit primary-zone membership and city-derived delivery authority;
- safe new-store delivery defaults;
- structured manual-payment evidence with backup/restore round trip;
- stable option IDs and DB-derived signed price deltas;
- `create_store_order_authoritative_v3(...)` as the order boundary.

Its shared files are **not safe to take wholesale**. Current Order route still contains the stale rule that `planLive=true` can make `is_published=false` transactional. Production has unpublished stores with active subscriptions, so this would expose merchant drafts. Final convergence must preserve the hardening invariant: unpublished means non-public/non-transactional; published legacy/no-subscription remains supported; published subscribed stores require a live plan.

Order's `CartDrawer.tsx` also carries #318 option identity but reintroduces the unsupported loyalty promise and the old hand-rolled drawer. `CartContext.tsx` carries option IDs/commercial pricing but lacks later malformed-storage, quantity/line-bound, unavailable/deleted-product and tenant-safe merge hardening. `Checkout.tsx` / `useOrders.ts` correctly carry city-derived delivery, option IDs, expected unit price and structured manual-payment reference; those portions should win during hand composition.

### Payment — #317 / #327

PR #366 head `42815b160...` strengthens lifecycle safety with release-at-most-once markers, unresolved-provider cancellation blocking and a durable succeeded-attempt guard. The **pushed** Payment branch still calls legacy v2 and carries the same stale unpublished/live-plan route rule, so it is not independently convergence-accepted.

A detached local composition on `samvr` has already proven the required semantic revision: Payment lifecycle wrapper → `create_store_order_authoritative_v3(...)`, route → lifecycle wrapper, full authoritative delivery/payment/manual-reference inputs preserved, and latest lifecycle guards retained. This proves feasibility; it is not a published release branch.

### Invite + staff seats — #323 / #325

PR #368 head `849abada...` now composes #323/#325 in one authority boundary: pending owner-valued staff invites are rejected, staff-seat entitlement is resolved transactionally at claim time, pending invites do not reserve seats, owner does not consume a purchasable staff seat, negative limit is unlimited, store-scoped locking serializes last-seat claims, and direct membership writes share the same entitlement boundary.

Real PostgreSQL proof on the lane reports exactly one last-seat winner, loser invite remaining pending, direct over-limit denial, freed-seat reuse, unlimited-plan behavior and plan-downgrade rejection. Keep the issues open until integrated rollout/postdeploy proof.

### Dependency security — #367

Still open. Apply the patched Next/Sharp graph only after code/schema convergence, regenerate the final lock once with Node 24/npm 11.17, and prove `npm ci`, audit, build and image-optimizer smoke.

## Detached P0 composition proof on `samvr`

A local detached all-P0 composition was built from the current Billing/Order/Payment/Invite heads. It is **not a published release branch** and must not be deployed directly, but it demonstrates that Payment→v3 composition is viable without weakening the coordinator contract.

Observed proof:
- P0 coordinator contract: **22/22 PASS**;
- full repository suite: **844/844 PASS**;
- typecheck: PASS;
- migration drift: PASS;
- ESLint: PASS, 0 errors / 4 warnings;
- `git diff --check`: PASS;
- production build: PASS;
- Order + Payment migrations apply together on disposable PostgreSQL;
- transactional Order/Payment composition smoke: PASS;
- adapted Payment lifecycle DB smoke: PASS.

The candidate confirms Payment wrapper → v3, route → lifecycle wrapper, latest release/reconciliation/terminal-success guards retained, Billing/Invite/Order/Payment drift entries coexisting, and Invite owner rejection/atomic claim surviving composition. It still predates hand-composition with the full R4 hardening branch and is not the final release candidate.

## Hardening branch validation at `d1487b6...`

An isolated detached worktree executed the hardening code locally on `samvr`, independent of the non-executing hosted runners.

- focused commerce/security/accessibility suite: **33/33 PASS** on the implementation state before two regression-test repairs;
- follow-up queue + CartDrawer regression set: **7/7 PASS**;
- full suite after the test repairs: **1,070 total / 1,067 pass / 3 fail**;
- the three remaining failures are inherited frozen-R4 source-contract failures: admin catch-all heavy-route contract, Beauty compact-mobile discovery contract, subscription transactional source contract;
- typecheck after the queue test repair: PASS;
- migration drift: PASS;
- lint: 0 errors, warnings only;
- `git diff --check`: PASS;
- production build of the identical runtime implementation before the two test-only repairs: PASS.

The two follow-up commits change tests only, not runtime/build code. Hosted GitHub badges remain non-evidence: inspected Quality Gate jobs complete with `steps=[]` and `runner_id=0`, so no checkout/test/typecheck/lint/build command runs there.

## Hardening contracts that must survive convergence

- **#311 public commerce:** unpublished stores remain non-public/non-transactional even with live subscription; published legacy stores remain supported; published subscribed stores require live plan.
- **#312 analytics/revenue:** order creation records `order_created` / `order_created_item`, not settlement; no sale revenue at order creation; cancellation alone creates no fabricated financial reversal.
- **#313 coupon identity:** store-scoped coupon identity with positive two-store/same-code DB smoke.
- **#315 loyalty:** launch fail-closed; no shopper points-earning promise until a real ledger exists.
- **#319 returns/refunds:** explicit external/manual recordkeeping; unsupported store credit disabled; settlement reference required; pending DB cap against order total.
- **#322 recovery recipient authority:** no arbitrary guest automated recipients; authenticated email authority retained.
- **#324 RBAC:** owner/admin tenant administration; editor catalog/content/day-to-day fulfillment; viewer non-sensitive read-only; browser membership mutation removed.
- **#326 background reliability:** retry-required recovery first, durable notification/analytics identities, cancellation runner intentionally has no financial side effect before settlement authority.
- **#329 merchandising truth:** no unsupported FBT, 10% bundle saving, fabricated Bestseller/New, or one-image Before/After claim.
- **#331 accessibility:** Navbar disclosure semantics, CartDrawer Radix Sheet, product lightbox Dialog, SearchBar combobox/listbox semantics, 44×44px modal close controls.
- **#333/#334 auth:** restrictive Firebase CSP + immutable project/UID subject binding; no silent mutable email/phone account merge or password reset bridge.
- **#363 invoice print:** dynamic print fields HTML-encoded before `document.write`.

## High-risk shared-file composition rules

The P0 candidate and hardening branch differ substantially in the exact files most likely to regress authority. Hand-compose these files and add final integrated regressions:

- `src/app/api/orders/create/route.ts`: Payment lifecycle wrapper + Order v3 arguments win; hardening unpublished-store/access/body/recovery truth wins.
- `src/app/api/orders/create/recovery.test.ts`: preserve both v3/lifecycle assertions and hardening recovery/body/security cases.
- `src/views/Checkout.tsx`: Order city-derived delivery and structured option/manual-payment assertions win; retain hardening guest/auth/recovery truth.
- `src/hooks/useOrders.ts`: preserve `optionIds`, `expectedUnitPrice`, `deliveryZone`, `manualPaymentReference` plus later status/mutation hardening.
- `src/context/CartContext.tsx` and `src/context/cart-context.ts`: combine stable option identity/commercial pricing with 50-line/99-quantity bounds, malformed-storage normalization, tenant-safe local+DB union validation, availability pruning and safe storage handling.
- `src/components/CartDrawer.tsx`: combine Order option IDs/default commercial selection with hardening fail-closed loyalty and Radix Sheet accessibility.
- `src/integrations/supabase/types.ts`: regenerate/reconcile from the complete final schema.
- `supabase/migration-drift-policy.json`: strict union of accepted pending-production entries.
- `scripts/run-rls-smoke.mjs`: strict union of all accepted smokes; capability-matrix smoke supersedes obsolete editor-as-manager semantics.
- `package.json` / `package-lock.json`: preserve all coordinator scripts; apply #367 last and regenerate lock once.

Final integrated regressions must explicitly prove: unpublished+live-plan store cannot transact, non-zero commercial option delta persists authoritatively, city-derived zone cannot be downgraded by client input, structured manual-payment evidence survives, cart option identities do not collapse, stale/unavailable products are pruned, loyalty promise stays absent, and CartDrawer remains a modal Sheet.

## Migration order

Preserve the non-colliding sequence:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order authority → `14203000` payment lifecycle → `14205500` storefront manual-payment replay → `14211000` coupon scope → `14212000` cart quantity → `14213000` product tenant consistency → `14213500` direct-order mutation lock → `14214000` owned-reference consistency → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery-message authority → `14224000` recovery-touch dedupe → `14225000` coupon privacy → `14225500` function search paths → `14231000` order-background idempotency → `14232000` external auth binding → `14233000` role capability matrix → `14233500` viewer-read/preview authority.

Do not renumber an already-pushed migration unless a real pre-rollout collision is found.

## Required final Runtime-7 / rollout gates

Before production migration/deploy:

- publish one exact convergence candidate and record its SHA;
- run coordinator P0 contract on that exact SHA;
- Node 24/npm 11.17 clean `npm ci`;
- typecheck, complete suite, lint, diff-check and production build;
- migration drift guard plus every relevant preflight/rollback-only DB smoke;
- v3 adversarial matrix with non-zero option delta, delivery/payment/manual-reference tamper cases;
- lifecycle abandonment/retry/cancel, execute concurrency, uncertain reconciliation and release-at-most-once proof;
- Billing preflight/postdeploy after #314 finance reconciliation;
- Invite atomicity, owner-role rejection and last-seat race on integrated schema;
- #324 real owner/admin/editor/viewer/cross-store RLS matrix;
- duplicate manual-payment and direct-order mutation negatives;
- two-store/same-coupon positive + coupon-enumeration negative;
- recovery arbitrary-recipient negative + authenticated-email positive;
- duplicate background-effect proof;
- real browser #331 keyboard/focus/zoom/AT verification;
- production-like Firebase OTP and immutable-subject bridge proof;
- hostile printable-invoice field proof;
- #367 audit/build/image-optimizer smoke.

During cutover, deploy matching schema/app/Edge code together, prove every app instance uses lifecycle → v3, then retire service-role execution of superseded v1/v2 before reopening checkout. Refresh `supabase/production-migration-ledger.json` only after observing production migrations and remove only the corresponding `pending-production` exceptions.

No production mutation has been performed by this hardening lane.

## Release decision

**NO-GO / SAFE TO INTEGRATE AS-IS: NO.**

The main technical uncertainty is no longer whether Order and Payment can compose: detached P0 proof demonstrates that they can. Remaining work is to publish a conflict-resolved P0+R4 candidate that preserves every hardening contract above, resolve #314 historical finance truth and #367, then execute governed DB/browser/provider/identity validation on that one exact SHA.