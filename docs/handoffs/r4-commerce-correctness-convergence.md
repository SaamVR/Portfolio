# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Exact checkpoints

- Frozen R4 storefront: `d6c689a469fdc419cefca224c0e5f046644bb2df`
- Production/P0 base: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- P0 coordinator inspected: `2a4ab729989c3cf9739c62572aa465ba4a4ad03e`
- Hardening runtime/test implementation checkpoint: `d1487b64965fa0b1ad273f7f1b7e117653408f92`
- Billing PR #364: `7270899b8f27628bb7b304b2db1fb41cd53e133f`
- Order PR #365: `8846129614ad6bf17633954a2e8d6cc59baf597c`
- Payment PR #366: `42815b160af3e8c6e4e6ce6ff0d3ede76a186d58`
- Invite PR #368: `849abada98722a3b65f915198a46fd42c1f760e5`
- Dependency P0: #367 open

Commits after `d1487b6...` only update this handoff document. Runtime code and executable regression tests are unchanged.

## Release authority

One final SHA must preserve all five contracts simultaneously: Billing authority, Invite atomic/staff-seat authority, Order v3 monetary authority, Payment lifecycle wrapped around v3, and R4 commerce/security hardening. Do not resolve overlapping files wholesale. The final SHA must pass `scripts/verify-p0-release-contract.mjs` without weakening its checks.

## P0 state

### Billing #308/#314

Code/database proof is strong. Production still has one normalized manual-bKash transaction identity attached to two paid invoices. Finance/provider-authoritative reconciliation is required before the #314 uniqueness migration. Never infer the winner.

### Order #309/#310/#318

Order head provides city-derived delivery authority, structured manual-payment evidence, stable option IDs/DB deltas, safe new-store delivery defaults and `create_store_order_authoritative_v3(...)`.

Do not take its shared files wholesale. Its route still permits `planLive=true` to make `is_published=false` transactional, which would expose private merchant drafts. Its CartDrawer restores unsupported loyalty copy and the old hand-rolled drawer. Its CartContext carries option identity but lacks the later malformed-storage, quantity/line bound, availability-pruning and tenant-safe merge hardening.

### Payment #317/#327

The pushed Payment head retains release-at-most-once, unresolved-provider cancellation block and terminal-success guards, but still wraps legacy v2 and carries the stale unpublished/live-plan route rule.

A detached local composition on `samvr` successfully rewired the lifecycle wrapper to v3 and the route to the lifecycle wrapper while retaining the latest guards. This proves feasibility only; it is not a published release branch.

### Invite #323/#325

The current Invite head rejects owner-valued staff invites, resolves staff-seat limits transactionally, keeps pending invites non-reserving, excludes owner from staff-seat count, supports unlimited sentinel behavior, serializes last-seat claims and prevents direct-table bypass. Real PostgreSQL last-seat/downgrade/unlimited/freed-seat proofs were reported by the lane.

### Dependency #367

Still open. Apply the patched Next/Sharp graph only after convergence, regenerate the lock once with Node 24/npm 11.17, then prove clean install/audit/build/image optimization.

## Detached all-P0 composition proof

A local detached P0 candidate on `samvr` composed current Billing/Order/Payment/Invite authority and produced:

- coordinator contract **22/22 PASS**;
- full suite **844/844 PASS**;
- typecheck PASS;
- migration drift PASS;
- ESLint 0 errors / 4 warnings;
- `git diff --check` PASS;
- production build PASS;
- combined Order+Payment migration apply PASS;
- transactional composition smoke PASS;
- Payment lifecycle DB smoke PASS.

It proves Payment→v3 can compose cleanly, but it does not yet include all hardening shared-file semantics and is not deployable.

## Hardening validation at runtime checkpoint `d1487b6...`

Executed in an isolated detached worktree on `samvr`:

- focused commerce/security/accessibility: **33/33 PASS**;
- queue + CartDrawer follow-up regression: **7/7 PASS**;
- full suite: **1,070 total / 1,067 pass / 3 fail**;
- the only three failures are inherited frozen-R4 source contracts: admin catch-all heavy-route contract, Beauty compact-mobile discovery contract, subscription transactional source contract;
- typecheck PASS after the queue-test typing repair;
- migration drift PASS;
- lint 0 errors, warnings only;
- `git diff --check` PASS;
- production build PASS on identical runtime code before the two final test-only repairs.

Hosted GitHub workflow badges are not execution evidence: inspected Quality Gate jobs have `steps=[]` and `runner_id=0`.

## Hardening contracts that must survive final composition

- #311: unpublished stores remain non-public/non-transactional even with live subscription; published legacy stores remain supported; published subscribed stores require live plan.
- #312: order creation is `order_created`, not settlement/revenue; cancellation alone is not a financial reversal.
- #313: coupon identity is store-scoped; same code may exist in different stores.
- #315: loyalty stays fail-closed; no points promise without a ledger.
- #319: returns/refunds are explicit external/manual recordkeeping; no fake store credit; reference evidence and amount bounds.
- #322: guest recovery cannot nominate arbitrary automated recipients.
- #324: owner/admin tenant administration, editor content/catalog/day-to-day fulfillment, viewer non-sensitive read-only; no browser membership mutation.
- #326: retry-required recovery first; durable side-effect identities; no cancellation-generated finance event.
- #329: no fabricated FBT/bundle saving/Bestseller/New/Before-After evidence.
- #331: Navbar disclosure semantics, CartDrawer Radix Sheet, lightbox Dialog, SearchBar combobox/listbox semantics, 44px close controls.
- #333/#334: restrictive Firebase CSP and immutable project+UID binding; no silent mutable-identity merge/password reset bridge.
- #363: printable dynamic fields are HTML-encoded.

## High-risk shared-file rules

Hand-compose these files:

- `src/app/api/orders/create/route.ts`: Payment lifecycle + Order v3 inputs win; hardening unpublished-store/body/recovery/access truth wins.
- `src/app/api/orders/create/recovery.test.ts`: preserve v3/lifecycle tests plus hardening recovery/security tests.
- `src/views/Checkout.tsx`: Order city-derived delivery/option/manual-reference fields win; preserve hardening guest/auth/recovery truth.
- `src/hooks/useOrders.ts`: keep option IDs, expected unit price, delivery zone, manual reference plus later mutation/status hardening.
- `src/context/CartContext.tsx` + `src/context/cart-context.ts`: combine option identity/commercial pricing with 50-line/99-quantity bounds, malformed-storage normalization, tenant-safe local+DB validation, unavailable/deleted pruning and safe storage.
- `src/components/CartDrawer.tsx`: combine authoritative option selection with fail-closed loyalty and Radix Sheet accessibility.
- `src/integrations/supabase/types.ts`: regenerate/reconcile from final schema.
- `supabase/migration-drift-policy.json`: union all accepted pending-production entries.
- `scripts/run-rls-smoke.mjs`: union all current smokes; capability-matrix semantics supersede obsolete editor-as-manager assumptions.
- `package.json` / `package-lock.json`: preserve coordinator scripts; apply #367 last and regenerate lock once.

Final integrated regressions must prove unpublished+live-plan cannot transact, non-zero option delta is authoritative, city-derived zone cannot be downgraded, manual evidence survives, cart option identities do not collapse, stale/unavailable products are pruned, loyalty promise remains absent and CartDrawer remains a modal Sheet.

## Migration order

Preserve:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order → `14203000` payment lifecycle → `14205500` storefront manual replay → `14211000` coupon scope → `14212000` cart qty → `14213000` product tenant consistency → `14213500` direct-order lock → `14214000` owned refs → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery-message authority → `14224000` recovery-touch dedupe → `14225000` coupon privacy → `14225500` search paths → `14231000` background idempotency → `14232000` external auth binding → `14233000` capability matrix → `14233500` viewer-read/preview authority.

## Final Runtime-7 gates

Before production:

- publish one exact conflict-resolved candidate;
- coordinator contract PASS on that SHA;
- Node 24/npm 11.17 clean install;
- typecheck/full suite/lint/diff/build;
- drift + every relevant preflight/DB smoke;
- v3 non-zero option/delivery/payment/manual tamper matrix;
- Payment abandonment/retry/cancel/concurrency/reconciliation/release proof;
- Billing pre/postdeploy after #314 reconciliation;
- Invite owner/atomic/last-seat proof on integrated schema;
- #324 real role/cross-store RLS proof;
- direct-order/manual-replay/coupon/recovery/background negatives;
- #331 real browser keyboard/focus/zoom/AT proof;
- Firebase OTP/subject-binding proof;
- printable invoice hostile-field proof;
- #367 audit/build/image-optimizer proof.

Deploy matching schema/app/Edge code together, verify every app instance uses lifecycle→v3, then retire service-role execution of superseded v1/v2 before reopening checkout. Refresh the production migration ledger only after observed production application.

No production mutation has been performed by this hardening lane.

## Decision

**NO-GO / SAFE TO INTEGRATE AS-IS: NO.**

Order+Payment composition is now proven feasible. The remaining release work is conflict-resolved P0+R4 publication, #314 finance reconciliation, #367 dependency remediation, and governed DB/browser/provider/identity verification on one exact SHA.