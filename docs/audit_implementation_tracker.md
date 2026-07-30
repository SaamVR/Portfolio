# Audit Implementation Tracker - Commerce Engine

Working note created: 2026-07-29

Current closeout note: `docs/final_audit_closeout_2026-07-30.md`

Latest consolidated re-audit: `docs/saas_reaudit_2026-07-30.md`

The 2026-07-30 re-audit supersedes any broad "P6 complete" interpretation in this tracker. It confirmed the UI and migration work, but found launch-blocking subscription mutation policy, payment secret-storage, courier multi-zone persistence, test/lint, analytics-ingestion, and live-proof gaps. Use the re-audit's P0-P3 sequence as the next implementation plan.

Purpose: keep one running tracker of the original audit findings, the implementation work already completed across the audit/refinement batches, and the items that still need one final full verification pass before launch.

As of Thursday, July 30, 2026:

- DB smoke is green again
- billing mismatch reconciliation is at zero rows
- lint and production build are green
- protected-route browser smoke is green
- positive live notification proof is still deferred
- positive Cloudflare domain and SSL proof is still deferred

This is intentionally separate from:

- `docs/launch_audit.md`
- `docs/final_saas_ready_audit_report.md`

Those documents capture the audits themselves. This file tracks what we have already implemented since then so we can do one clean final audit at the end instead of re-auditing piecemeal.

## Source-of-truth audit inputs

- `docs/launch_audit.md`
- `docs/final_saas_ready_audit_report.md`

## How to use this note later

At final audit time:

1. Re-read the original audit docs.
2. Re-check every item in this tracker against current code, current database state, and real rendered/runtime behavior.
3. Mark anything as:
   - implemented and verified
   - implemented but needs live verification
   - partially implemented
   - still open
   - superseded by newer architecture

## Already implemented since the earlier audits

### P0 - Launch blockers / hardening

- Billing checkout locked to authenticated store managers with server-derived pricing.
- Billing callback/webhook reconciliation hardened around invoice, store, provider payment ID, and subscription consistency.
- `store_subscriptions` established as the entitlement source of truth through the billing flow.
- Subscription truth locked to server-side billing paths on 2026-07-30: authenticated clients now have scoped `SELECT` only, live owner-JWT mutation attempts fail, two missing paid subscriptions were reconciled, and the latest-paid consistency query reports zero mismatches.
- Public mock/demo payment exposure removed or hardened out of the live path.
- Custom domain mutations hardened to store-authorized users.
- Custom domain verification/routing work moved toward real ownership and safer routing behavior.
- Reversed `can_manage_store(...)` policy argument issues were repaired with follow-up migration coverage.
- Example secret hygiene and tracked env cleanup work was done earlier; final rotation/recheck still belongs in the final launch audit.
- Courier credential storage was moved off the inaccessible `private` schema Data API path into service-role-only `public.store_courier_credentials_secure`, and the linked migration was applied on 2026-07-29.

### P1 - Core SaaS refinement

- Launch readiness dashboard implemented.
- Notification control center implemented.
- Merchant analytics expanded beyond simple revenue charts into more useful merchant behavior reporting surfaces.
- Domain/payment/operator diagnostics surfaces added.
- Backup/restore merchant UX and platform-targeted restore flows were improved.
- UI polish passes were done across the new admin surfaces, including spacing/card density work and in-browser route verification rounds.

### P2 - Merchant/storefront and operator flow maturation

- Merchant-facing operational/admin flows were extended instead of left as static stubs.
- Checkout/order handling and store-ops paths were tightened through authenticated route usage and safer store-scoped data handling.
- Store/admin ergonomics and launch-readiness helpers were improved to support real merchant activation rather than demo-only flow.

### P3 - Next batch audit/refinement cycle

- Additional audit-first -> implement -> verify workflow was followed for the next batch.
- Follow-up improvements were implemented incrementally instead of rewriting the platform wholesale.
- Final re-audit is still needed because this phase built on evolving state rather than closing everything in one pass.

### P4 - Next batch continuation

- Continued audit-driven implementation work landed after P3.
- This should be treated as implemented work that still needs a consolidated final verification pass, not as automatically launch-certified.

### P5 - Feature expansion batch

- CSV product import/export added.
- QR code generator added.
- Abandoned-cart recovery added.
- Blog system added.

These need one final launch-quality pass together for:

- store scoping
- auth/permissions
- analytics coverage
- UI clarity
- failure states
- backup/restore compatibility

### P6 - Audit hardening, billing maturity, BD intelligence, courier layer

- Deeper anon/public grant hardening work landed.
- Operator billing controls were added.
- Courier foundation was added.
- Courier connections became editable beyond basic status toggles.
- Shipment creation/booking actions were added from orders.
- Server routes and shared courier helpers were added for secure booking/connection handling.
- Merchant admin can now assign provider credential fields without exposing secrets in the browser.
- Courier provider setup guidance, completeness scoring, recommendation badges, validation warnings, and “why not recommended yet” checklists were added.
- Courier duplication for multi-zone merchants was added.
- Zone label and service-area support was added for courier setups.
- Inline “required for connected status” badges and provider presets like `Dhaka COD`, `Outside Dhaka prepaid`, and `Manual backup courier` were added.
- Shipment activity now uses a secured server route instead of a fragile browser-side direct read.

#### P6 closeout checkpoint - 2026-07-29

Verified in the current re-audit:

- Billing checkout route authorization and side-effect tests passed.
- Billing subscription route authorization and side-effect tests passed.
- Manual billing review route side-effect tests passed.
- bKash callback context-integrity tests passed.
- Billing page loads real current subscription/invoice data in-browser.
- Courier connection authorization and side-effect tests passed.
- Courier booking authorization and side-effect tests passed.
- Courier workspace loads successfully in-browser and no longer shows the prior unavailable-state failure.
- Courier credential storage now uses `public.store_courier_credentials_secure` with service-role-only grants, and the migration is applied on the linked database.

Still open before P6 can be called fully closed:

- Manual payment submission was moved off the browser write path on 2026-07-29. `src/views/admin/Billing.tsx` now posts to `src/app/api/billing/manual-invoice/route.ts`, and auth plus side-effect tests cover server-derived pricing and duplicate transaction handling.
- The server-side checkout/callback billing route smoke passed on 2026-07-30 and verified the persisted invoice/subscription result; a real-money provider transaction remains a separate launch-certification exercise.
- A full positive live courier booking loop was not executed in this re-audit because the currently inspected store had zero connected courier connections and zero live shipment rows.
- Billing/entitlement readers resolve from `store_subscriptions`; operator analytics and merchant diagnostics were aligned with the shared effective-status contract on 2026-07-30. Remaining `supabase as any` usage is type-safety debt, not an alternate entitlement source.

## Implemented recently but should be explicitly re-audited later

These are likely implemented, but should still be treated as “needs final audit confirmation” rather than automatically done:

- Billing maturity end to end:
  - upgrade/downgrade behavior
  - invoice/payment lifecycle
  - operator/manual review flow
  - subscription consistency across every reader
- Courier layer end to end:
  - live connection loading
  - booking from orders
  - per-provider setup safety
  - secret storage isolation
  - merchant guidance correctness
- Analytics/reporting:
  - seller-useful event coverage
  - date filtering/export correctness
  - tenant isolation
- Backup/restore:
  - restored data completeness
  - safe defaults
  - later-added entities included in backup format
- Diagnostics/admin surfaces:
  - real signal quality
  - not just static UI
- Notifications:
  - event logging
  - operator usefulness
  - any real delivery/provider edge cases

## Open or likely still needing final audit confirmation

These are not declared solved by this tracker. They should be re-checked during the final full audit:

- Any remaining hardcoded platform-brand copy in merchant/customer storefront paths.
- Any remaining legacy `DEFAULT_STORE_ID` style fallbacks or tenant-leak risk.
- Any remaining SEO/canonical/domain mistakes on merchant storefront pages.
- Any routes that may still rely on outdated `supabase as any` patterns where type drift could hide runtime issues.
- Global/admin/storefront error boundaries and not-found behavior.
- Final secret rotation status and secret scanning posture.
- Real live payment behavior, not just code correctness.
- Real live notification behavior, not just local logging.
- Any remaining stale or superseded findings from the older audits that should now be marked closed.

## Remaining items pulled directly from the main audits

These are the concrete remaining things that should stay visible in the tracker until we do the final all-at-once audit.

### Remaining from `docs/launch_audit.md`

#### Critical storefront / tenant integrity

- Checkout -> order-success redirect should be re-checked to ensure CMS storefront orders land on the tenant storefront success route, not any legacy route.
- Order success page and follow-up storefront links should be re-checked for dynamic merchant branding and tenant-safe navigation.
- Remaining `DEFAULT_STORE_ID` / fallback-store usage should be re-audited for cross-tenant leakage risk.

#### High-priority resilience / security / code-quality

- Add or verify `error.tsx` and `not-found.tsx` coverage for:
  - global app
  - admin
  - storefront
- Re-audit all customer-facing hardcoded `ThreadBD` copy and any platform-brand bleed into merchant storefronts, invoices, and trust pages.
- Re-check public schema grants so `anon` has only the minimum intended access.
- Re-check whether remaining `supabase as any` usage is still necessary or now removable after current schema/types work.
- Re-confirm the billing subscription mutation route auth/ownership guard.

#### Medium-priority polish / resilience

- Re-check the `Outlet` shim so it never renders a broken production error box.
- Re-check any remaining `location.state` assumptions in legacy React Router shim flows.
- Re-check storefront canonical URL generation for tenant-safe SEO behavior.
- Re-audit public storefront query pressure/rate-limiting or caching strategy.
- Re-check cart/provider store scoping so global providers cannot drift across tenants.
- Re-check migration naming/discipline consistency.
- Consider whether health checks and lightweight monitoring should be added if still missing.

### Remaining from `docs/final_saas_ready_audit_report.md`

#### Phase 0 / Phase 1 items that still need final confirmation

- Secret rotation and secret scanning posture should be re-confirmed, not just code-tracked cleanup.
- Public debug/test route removal should be re-confirmed against the current route tree.
- Subscription-state consistency should be verified across every reader and write path.
- Upgrade/downgrade/cancellation/renewal UX should be verified as a full loop, not just as individual screens.
- Email delivery observability should be re-checked with real event evidence.
- Order/checkout flow hardening should be re-checked for cancellation/refund/restock edge cases.
- Storefront tenant routing should be re-verified live, including newly verified domain behavior.
- Store switching behavior should be re-checked for cache correctness and merchant context safety.

#### Phase 2 polish items that should stay on the board

- CMS/editor usability still needs final audit confirmation, even after the recent refinement passes.
- Admin information architecture should be re-evaluated after all new pages/features are in.
- Storefront UX should be re-audited after all merchant-facing fixes land together.
- Trust/onboarding flow should be re-checked as a real first-merchant journey.

#### Phase 3 operations items that should stay open until final verification

- Observability should be re-checked as an operational system, not only as added tables or screens.
- Backup/restore should be re-verified against real current data shape and later-added features.
- Security baseline should be re-checked across grants, routes, secrets, and dependency posture.
- CI/CD release discipline should be re-checked so launch verification is repeatable and not manual-memory-based.

## Suggested final “remaining audit” closeout pass

When we return for the final combined audit, explicitly walk these buckets in order:

1. Launch-audit critical storefront and tenant-isolation items
2. Billing/subscription/payment truth
3. Domain/routing ownership and tenant SEO
4. Merchant branding / white-label correctness
5. Courier and fulfillment live operability
6. Notifications / email / delivery observability
7. Analytics / reporting / export integrity
8. Backup / restore / deletion safety
9. Error boundaries / resilience / operational diagnostics
10. Secret hygiene / grants / CI release discipline

## Suggested final audit checklist

When all implementation/refinement batches are finished, run one full pass covering:

1. Auth and tenant isolation
2. Billing and subscription truth
3. Domain ownership and routing
4. Courier and fulfillment operations
5. Notifications and delivery logging
6. Merchant analytics quality
7. Backup/restore completeness
8. Storefront branding / SEO / white-label integrity
9. Admin resilience and error states
10. Secret hygiene and deployment readiness

## Important note

This file is a planning and tracking document, not proof that every item is production-verified.

Anything listed above as implemented should still be re-checked against:

- current code
- current linked database state
- current env/deployment state
- real browser behavior
- real merchant flow behavior
