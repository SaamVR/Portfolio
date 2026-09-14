# P0 Release Blocker Coordination — 2026-09-14

Production baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
Coordinator branch: `release/p0-blocker-coordination-2026-09-14`
Frozen R4: `d6c689a469fdc419cefca224c0e5f046644bb2df`
Canonical release ledger: GitHub #320

## Lane ownership

| Lane | Branch | Issues | Authority |
| --- | --- | --- | --- |
| A | `release/p0-billing-authority` | #308, #314 | SaaS invoice settlement, entitlement grant, manual billing transaction identity |
| B | `release/p0-order-authority` | #309, #310, #318 | authoritative order creation, delivery, payment eligibility, commercial option identity/pricing |
| C | `release/p0-payment-lifecycle` | #317, #327 | reservation expiry/release, storefront provider payment attempts/execution/reconciliation |
| D | `release/p0-invite-authority` | #323 | transactional single-use invite claim and authority grant |
| Coordinator | `release/p0-blocker-coordination-2026-09-14` | Runtime 7/8 | integration, cross-lane regression, release decision |

## Live coordination snapshot

- Coordinator worktree verified clean at exact baseline with Node `v24.19.0`.
- Lane A has active uncommitted work: manual-invoice route, provider transaction normalization helper, migrations for #308/#314.
- Lane B has active uncommitted work: order input commercial option IDs, expected unit price assertion, commercial-option resolver, store payment authority.
- Lane C worktree is present and currently clean at baseline.
- Lane D branch exists remotely; no local worktree was present at this checkpoint.
- Threads template-production work is presentation-only at this checkpoint and does not overlap P0 authority files.
## R4 overlap rule

`hardening/r4-commerce-correctness` is not presentation-only. It currently contains commits that change `src/app/api/orders/create/route.ts`, `src/hooks/useOrders.ts`, `src/lib/cms/order-input.ts`, `src/views/Checkout.tsx`, and payment/pricing helpers. Those commits partially address #309/#310 at the server-route/UI boundary.

P0 Lane B remains canonical owner of #309/#310/#318. Do not independently merge the R4 commerce branch over Lane B. During final integration, reconcile useful R4 behavior into the accepted Lane B authority contract, preserving any R4 UX that remains correct.

## Cross-lane contract

- Lane B may determine payment-method eligibility during order creation, but must not invent payment-attempt/execution states; those belong to Lane C.
- Lane C may add reservation/payment lifecycle state, but must consume the authoritative order amount/method/options produced by Lane B rather than recompute a competing price contract.
- Lane A manual SaaS billing transaction identity is a platform-billing namespace. Lane C storefront provider transaction uniqueness must be scoped to the actual provider account/store contract; do not impose one global cross-domain transaction namespace without evidence.
- Lane D is isolated from commerce and must not reuse broad `can_manage_store` authority as a substitute for transactional invite claim authorization.
- R4 Section Studio, variant options, section renderers, template composition, and template visual design remain out of P0 ownership.

## Migration coordination

Existing production-main migrations currently end before the 2026-09-14 lane window. Lane A is using `20260914140000` and `20260914140500`. Other P0 lanes must use unique, non-colliding timestamps and final integration must verify deterministic ordering and schema dependencies. Frozen R4 currently carries `20260914161500_r4_section_studio_variant_options.sql`.

## Integration gate

No lane is accepted from issue closure alone. Required for each P0: exact authoritative-path reinspection, negative exploit regression, legitimate positive-path proof, schema/migration inspection, and concurrency/idempotency proof where relevant.

Integration order is provisional until lane migrations are visible. Default dependency order: Lane A and Lane D independently; Lane B before Lane C when Lane C depends on new order state/columns; then full cross-domain regression; R4/P0 reconciliation last.

Production publication remains forbidden until Runtime 7 evidence is complete and Runtime 8 names an explicit target SHA and GO/CONDITIONAL-GO/NO-GO decision.
## Known R4 ↔ P0 compatibility traps

- R4 commerce hardening currently uses checkout/body naming `deliveryLocation` and hook field `delivery_location`; Lane B's authoritative contract uses `deliveryZone` and persisted `delivery_zone`. Final integration must choose one canonical wire contract or provide an explicit compatibility alias. Do not silently drop the shopper-selected secondary zone.
- R4 `storefront-payment-availability` checks configured/connected presentation state, but Lane B `store-payment-authority` also checks server adapter secret completeness for connection-backed providers. The Lane B result is the monetary authority contract. R4 availability logic may remain a display aid only; it must not override or weaken Lane B's check.
- R4 `authoritative-checkout-pricing` computes shopper/server expected delivery from base product price. After #318, final monetary truth must come from Lane B's database-resolved commercial option prices. Any R4 pricing helper retained after integration is an assertion/display helper, not final order authority.
- Lane C currently has an in-progress wrapper around legacy `create_store_order_with_stock_v2`. This is blocked from integration until it wraps/extends Lane B `create_store_order_authoritative_v3` instead.
- Final `/api/orders/create` must have one production RPC path. There must not be selectable v2/v3/lifecycle paths for the same new storefront checkout.
## Migration deployment ordering
- Final R4 + P0 release must be treated as one ordered migration set.
- Current known order by filename: Billing #308 `20260914140000`, Billing #314 `20260914140500`, frozen R4 Section Studio `20260914161500`, Order Authority `20260914201500`, Payment Lifecycle `20260914203000`.
- Do not deploy the later P0 migrations and then casually append the older R4 migration afterward; validate the exact final migration ledger and deployment command against production first.
- Payment Lifecycle migration must be reconciled to the accepted Order Authority RPC before either order/payment migration is release-approved.

## R4 commerce-hardening reconciliation additions
- R4 `authoritative-checkout-selection` validates free-form labels against sizes/colors/metrics; it is weaker than #318 stable-ID + authoritative-delta pricing and must not replace the P0 contract.
- Lane B `commercial_options` / stable `optionIds` / database price derivation is canonical for paid commercial option authority.
- If the R4 label validator is retained, use it only as compatible legacy/input hardening and never as monetary authority.
- Preserve R4 hardening commits for bounded order-body parsing, server-side guest-checkout policy, and authenticated-email derivation when reconciling `/api/orders/create`.
- Re-test old/local cart compatibility explicitly because pre-P0 carts may contain labels without `optionIds`; do not silently let legacy labels regain pricing authority.

## Coordinator acceptance findings during active implementation
- #309: recomputing a fee from client-selected `primary|secondary` is insufficient while delivery settings have only human zone labels and no structured membership; final closure must remove cheaper-zone tampering or use a documented fail-safe launch rule.
- #310: HTTP payment-availability checks must not break exact idempotent replay when a method is disabled/disconnected after the first successful order creation; new creation and replay authority must remain distinct.
- #318: require a durable positive round-trip for an authoritative non-zero option delta, not only in-memory helper tests; legacy/synthetic priced options without stable IDs must fail closed.
- #323: atomic staff claim must require pending/not-revoked status, and email-bound invites must fail if the authenticated identity has no matching email. Do not guess legacy platform-invite schema; inspect it before binding changes.
- #327: provider `Initiated`/pending status is non-terminal and must remain quarantined. Current Lane C working tree now includes this classification and focused tests.

## Lane A integrated checkpoint

Accepted implementation SHA: `c3b8e18e6ab900767f255daa016e68f1a7cd7d35`.
Coordinator integration SHA: `c652abe6b662ea384236cfe0af13a0ba3da566b1`.

Post-integration verification:
- migration drift: PASS;
- focused billing/security suite: 57/57 PASS;
- TypeScript typecheck: PASS;
- unrelated storefront source-contract failure reproduced on untouched baseline and is not a Lane A regression.

Production read-only preflight on CMS Project:
- `store_invoices` still has authenticated INSERT/UPDATE policies and table mutation grants before migration #308;
- 14 current `bkash_manual` invoice rows have nonblank provider identities;
- one normalized provider transaction identity is duplicated across two paid invoices in different stores;
- therefore migration #314 must remain fail-closed until that historical duplicate is explicitly reconciled.

#308/#314 are implementation-integrated, not production-closed. Runtime 7 still requires governed production migration application and post-apply negative/positive proof.
## 2026-09-14 late coordinator checkpoint — integration ownership

- Lane A `c3b8e18e6ab900767f255daa016e68f1a7cd7d35` is integrated; coordinator includes it from `c652abe` onward.
- Lane C `23b1d6e` is **not accepted yet**: focused tests 30/30, drift green, typecheck green, but exactly-once release needs a durable release guard; terminal-success attempt recreation must fail closed; wrapper still composes over legacy v2 instead of Lane B v3.
- R4 commerce hardening now materially overlaps P0 order/payment work. Preserve its bounded request parsing, guest/public access checks, authenticated-email authority, cart-state hardening, storefront manual-payment replay ledger, and direct-order mutation lock.
- Lane B remains canonical for #309/#310/#318 monetary/order truth: stable option identity + DB-derived pricing, payment eligibility, delivery authority, and idempotent order creation.
- Lane C remains canonical for #317/#327: reservation lease/release, payment attempts, durable execution claim, provider-result reconciliation.
- Shared files (`/api/orders/create`, `useOrders`, `order-input`, Checkout, CartContext, migration policy) require semantic hand-composition; never resolve with wholesale ours/theirs.

### Combined migration chronology currently reserved

1. `20260914140000_lock_store_invoice_client_authority_308.sql`
2. `20260914140500_manual_bkash_transaction_replay_guard_314.sql`
3. `20260914161500_r4_section_studio_variant_options.sql`
4. `20260914201500_p0_authoritative_order_boundary.sql`
5. `20260914203000_payment_reservation_lifecycle_317_327.sql`
6. `20260914205500_storefront_manual_payment_replay_guard.sql`
7. `20260914211000_scope_coupon_codes_per_store.sql`
8. `20260914212000_bound_cart_item_quantity.sql`
9. `20260914213000_product_link_tenant_consistency.sql`
10. `20260914213500_lock_direct_order_mutations.sql`
11. `20260914214000_tenant_owned_reference_consistency.sql`
12. `20260914215000_enforce_commerce_numeric_bounds.sql`
13. `20260914215900_commerce_tenant_graph_consistency.sql`

There are currently no timestamp collisions across accepted/pending R4 + P0 migrations. Lane D must choose a later non-colliding timestamp. Final migration policy must classify every unapplied migration together before release.

## Parallel composition proof — 2026-09-14 late checkpoint

Coordinator built a throwaway detached composition from integrated Billing + the live uncommitted Lane B tree + committed Lane C `23b1d6e`; neither implementation branch was modified.

Observed textual conflicts were limited to three files: `src/app/api/orders/create/route.ts`, its recovery test, and `supabase/migration-drift-policy.json`.

The semantic adapter was prototyped as one chain: HTTP route -> `create_store_order_with_payment_lifecycle` -> `create_store_order_authoritative_v3`. The lifecycle wrapper mirrors the full v3 authority arguments rather than calling legacy v2.

Combined proof before the newest cancellation review: 45/45 targeted B+C tests PASS, migration drift PASS, and full TypeScript check PASS.

A second scratch-only lifecycle revision added durable release-at-most-once protection, terminal-success attempt blocking, and a cancellation guard that rejects `executing` / `reconciliation_required` provider outcomes while terminalizing safe pre-execute attempts. Focused post-revision proof: 24/24 PASS.

This proves composition viability only. Do not merge scratch code. Lane B must still close #309 delivery-zone membership + #310 manual-evidence contract and classify its migration. Lane C must land the reviewed lifecycle guards and v3 composition on its owned branch before acceptance.

## Coordinator checkpoint — 2026-09-14 late pass

### Lane B committed candidate `b2c212a`
- Full repository unit suite: 797/797 PASS.
- Production build: PASS when required public Supabase env placeholders are supplied; prior red build was missing-env only.
- TypeScript compilation is green.
- Candidate is still HELD: `p0_authoritative_order_boundary` remains unclassified in migration drift.
- #309 remains open because monetary delivery authority still consumes shopper `deliveryZone`.
- #310 remains open because manual bKash/Nagad are still prepaid-eligible without structured payment evidence.

### #309 final authority contract
- Merchant delivery settings need structured `primary_city_aliases` (or equivalent machine-verifiable membership), not only labels.
- Server/database derives `primary` only when normalized `shipping_city` matches configured membership.
- Unconfigured/unrecognized physical delivery falls back to the extended/secondary rate; client zone is display/assertion only.
- Digital-only delivery remains zero/`none`.
- Onboarding must not activate guessed Dhaka/default delivery truth without explicit merchant confirmation.
### #310 structured manual-payment contract
- Lane B owns a bounded structured manual-payment reference in the authoritative order contract; do not use free-form notes as monetary authority.
- For manual bKash/Nagad, method availability comes from store settings, while prepaid-benefit eligibility additionally requires valid structured evidence.
- Lane B migration should persist normalized manual provider/reference fields before R4's later replay-guard migration runs.
- R4 `storefront_manual_payment_claims` remains the global exactly-once provider/reference ledger, but should consume the structured identity for new orders; notes parsing may remain only for historical reconciliation.
- Migration order therefore stays B order authority (`20:15`) before R4 manual replay guard (`20:55`).

### Lane D current evidence
- Source contract tests: 2/2 PASS; typecheck PASS.
- Disposable PostgreSQL 16 smoke: PASS for concurrent staff/platform claims, negative cases, legitimate grants, identity binding, service-role ACL, and grant-failure rollback.
- `atomic_invite_claim_authority_323` is still unclassified in migration drift.
- DB authority must reject staff `owner` invites. Production has zero staff invites and owner/admin clients have `ALL` invite-management RLS, so this guard is required and migration-safe.

### Current release posture
- Do not integrate B, C, or D yet.
- B: fix #309/#310 + drift.
- C: land v3 composition + release/success/cancellation lifecycle guards.
- D: owner-role guard + drift, then rerun source/DB smoke/typecheck.

### Precomputed merge order / conflict matrix
- Preferred P0 order after acceptance: Lane D Invite -> Lane B Order -> Lane C Payment.
- Lane D vs current coordinator: migration-drift policy is the only expected semantic composition point.
- Lane D vs Lane B: generated `src/integrations/supabase/types.ts` may need hand composition/regeneration; authority domains are otherwise disjoint.
- Lane B vs Lane C: only `src/app/api/orders/create/route.ts` and its recovery test overlap materially; coordinator scratch already proved the lifecycle-wrapper -> v3 composition.
- Coordinator vs Lane C also composes migration-drift policy.
- After integrated P0 passes Runtime 7, reconcile R4 commerce hardening last; B currently overlaps 12 R4 files concentrated in checkout/cart/order-input/product propagation.
- R4 remains presentation/access/cart hardening authority; P0 B remains monetary/order authority; P0 C remains reservation/provider-execution authority.

### Production rollout authority gate
- Production currently grants `service_role` EXECUTE on legacy `create_store_order_with_stock` and `create_store_order_with_stock_v2`; anon/authenticated are already denied.
- B/C migrations are additive, so an old app instance can continue using v2 until the new app is fully deployed.
- Use a controlled checkout maintenance/drain window for the commerce migration + app/Edge Function cutover.
- Apply accepted migrations in timestamp order, then deploy the integrated app and matching `bkash-payment` / `claim-invite-code` Edge Functions.
- Run authoritative positive/negative smoke against the deployed target before reopening checkout.
- After all app instances are verified on the canonical lifecycle-wrapper -> v3 path, revoke `service_role` EXECUTE on superseded legacy order-creation RPCs (or otherwise retire them with an equivalent governed compatibility shim).
- Add a static regression asserting no production application/Edge Function path calls legacy v1/v2 order creation.
- Only then reopen checkout and record the exact production deployment SHA in Runtime 8 evidence.

### Structured delivery + manual-payment authority contract

#309 final acceptance target:
- add structured merchant-authored primary-zone membership (for launch, normalized `primary_zone_cities` or equivalent) to `delivery_settings`;
- derive authoritative primary-vs-extended zone from `shipping_city` server/database-side;
- if structured membership is absent or the city does not match, fail safe to the non-undercharging extended fee;
- browser `deliveryZone` may remain only as display/assertion input and must not reduce persisted monetary truth;
- new merchant signup must not silently publish guessed Dhaka delivery authority; leave delivery unconfigured/disabled until merchant confirmation.

#310 final acceptance target:
- enabled/connected store method remains the authority for whether a payment method is allowed and prepaid-eligible;
- manual bKash/Nagad evidence must be a dedicated structured order input/field, not parsed from free-form `notes`;
- validate/normalize the structured reference before order creation; manual payment remains merchant-review settlement, not falsely claimed provider verification;
- during final R4 reconciliation, `storefront_manual_payment_replay_guard` must consume the structured persisted reference for new orders; notes parsing may remain only as a historical migration/backfill compatibility path.

R4 status/update compatibility:
- `lock_direct_order_mutations` and the forward-only `/api/orders/status` route are retained;
- Lane C must still reject cancellation while payment attempt state is `executing` or `reconciliation_required` at the lifecycle/database boundary;
- release of stock/coupon must be guarded by durable release state independently of route-level transition restrictions.

### Latest R4 commerce ↔ P0 Order semantic merge recipe

Against R4 commerce `e5c3547`, the live Lane B revision has seven textual conflicts:
`/api/orders/create/route.ts`, its recovery test, `CartContext.tsx`, `useOrders.ts`, `Checkout.tsx`, `admin/Products.tsx`, and migration-drift policy.

Resolve them by invariant ownership, never ours/theirs wholesale:
- order route: retain R4 bounded body parsing, public storefront/access checks, guest-checkout policy, authenticated-email derivation and request hardening; P0 v3/lifecycle remains the only monetary/order-creation authority;
- R4 label-based option/pricing validation may remain only as fail-fast compatibility validation where it cannot disagree with or weaken stable P0 option IDs/database-derived price;
- checkout: retain R4 customer-access/buy-now/request UX hardening; remove shopper delivery-zone monetary authority and use P0 city-derived display/assertion + structured manual payment reference;
- CartContext: retain R4 cart line/quantity bounds, invalid-product pruning and merge protections while preserving P0 `optionIds`, authoritative selected-option price and fulfillment type in cart identity;
- `useOrders`: canonical field is P0 `delivery_zone` assertion + `manual_payment_reference`; do not restore R4 `delivery_location` as monetary authority;
- Products admin: retain R4 fetched full product-detail/image/metric safety and add P0 `commercial_options` + `fulfillment_type` authoring/round-trip; both are required;
- migration drift: union all pending-production entries; never discard one lane's classifications.

Most other Order changes apply cleanly onto R4, including current delivery editor/onboarding alias fields.

### Coordinator checkpoint after Billing follow-up
- Accepted Billing lane follow-up head `e1ee5059958ab0dcb3d68ba5ea427990effde6f7` was cherry-picked onto the coordinator.
- Coordinator head after the verified follow-up is `1e9335141493601ebf850096aa116b176d7bee64` before this documentation checkpoint.
- Combined coordinator verification: Billing focused suite 104/104 PASS, migration drift PASS, typecheck PASS.
- Added Billing protections include PUBLIC privilege revocation, executable pre/postdeploy gates, DB smoke, reconciliation runbook/provenance, and complete manual-review role authority (`admin`, `co_admin`, `super_admin`, `billing_admin`; support-only denied).
- Production #314 remains blocked on finance/provider reconciliation of the one ambiguous historical duplicate paid manual-bKash identity.

### Additional final-release dependency #367
- Keep the original eight canonical audit P0s unchanged for Runtime-7 closure.
- Track #367 separately as a final Runtime-8 security dependency: the current Next.js/Sharp image-optimization graph contains known critical/high advisories while image optimization is enabled.
- Resolve #367 in an isolated dependency/security lane; do not mix package/lockfile churn into Order, Payment, or Invite authority branches.
- Final GO requires patched Next + Sharp, corrected nested Sharp override/lock graph, reproducible `npm ci`, clean high/critical audit for this chain, and image-optimization smoke.
- R4 hardening commits after `5a1df57` currently change recovery-contact and order-analytics truth paths, not the P0 monetary/order/payment-attempt authority files; preserve them during final R4 reconciliation.

### Migration composition audit after latest R4 hardening
- New timestamped migrations across coordinator + Invite + Order + Payment + current R4: 20.
- Timestamp collisions: none. Duplicate migration filenames across lanes: none.
- Natural chronology remains Billing (14:00/14:05) -> frozen R4 Section Studio (16:15) -> Invite (20:05) -> Order (20:15) -> Payment (20:30) -> later R4 hardening (20:55 through 23:10).
- Every new migration is explicitly classified in its owning branch's `supabase/migration-drift-policy.json`, including `order_background_effect_idempotency`.
- Final integration must union all policy entries rather than choosing one branch's policy file wholesale.

### Production cutover runbook checkpoint
- Added `docs/runbooks/p0-r4-production-cutover.md` as the coordinator-owned final cutover contract.
- It fixes the checkout drain/maintenance rule, chronological migration sequence, app + Edge deploy ordering, postdeploy authority smokes, legacy v1/v2 RPC retirement, R4/P0 data-compatibility checks, #314 reconciliation, six-store delivery review, and #367 final security gate.
- Latest R4 delta through `8b8b98805e04b323911ef278c7c0c2e7afe76b0b` only updates convergence documentation and order-background reliability tests; it does not cross into P0 monetary/order/payment-attempt ownership.
