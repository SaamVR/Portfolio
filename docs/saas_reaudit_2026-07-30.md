# Commerce Engine SaaS Re-Audit

Audit date: 2026-07-30

Scope: current code, current linked Supabase project, production build, tests, lint, dependency audit, and representative merchant admin routes in the local browser.

This report is the current execution plan. The older audit documents remain useful historical inputs, while `audit_implementation_tracker.md` records previously completed batches.

## Executive verdict

Commerce Engine has strong SaaS breadth and the new P1-P6 work is visible in the real merchant workspace. It is not launch-certified yet.

The main problem is no longer missing screens. The remaining risk is correctness at the boundaries:

- merchants can still mutate their own subscription rows through the current database policy
- merchant bKash API credentials are still edited and saved through general browser-readable site settings
- the courier multi-zone duplication UX conflicts with a database uniqueness rule
- the full test and lint gates are not green
- several important features are implemented but have no positive live operating history
- backup/restore does not yet cover the full current P6 data shape

Recommended focus: stop adding broad new modules until P0 and P1 below are closed with live evidence.

## Evidence snapshot

### Verified working

- Linked Supabase project is active and all repository migrations through `20260729200611_courier_credentials_service_role_public_table` are applied.
- Production build passes.
- Typecheck passes.
- Production dependency audit reports zero known vulnerabilities.
- 211 of 213 automated tests pass.
- Launch Readiness, Billing, Couriers, Notifications, Diagnostics, Analytics, and Backup routes render in the signed-in merchant workspace.
- Billing shows persisted subscription and invoice state.
- Courier credentials are isolated in a service-role-only table.
- Notification observability has persisted `sent`, `failed`, and `skipped` examples.
- Analytics has 225 persisted first-party events across page, cart, checkout, search, and order-tracking interactions.

### Not yet proven live

- Courier: 0 connections, 0 connected providers, 0 shipments, and 0 credential rows.
- Backup: 0 persisted export/restore events.
- Domains: 3 rows, but 0 active Cloudflare custom hostnames.
- Blog: 0 posts.
- Billing: one paid-invoice/subscription mismatch exists and one invoice is pending.

### Quality gates

- `npm run build`: pass
- `npm run typecheck`: pass
- `npm audit --omit=dev`: pass, 0 vulnerabilities
- `npm test`: fail, 211 pass / 2 fail
- `npm run lint`: fail, 3 errors / 7 warnings

## P0 - Close before launch

### P0.1 Lock subscription truth to server-side billing paths

Status: completed and applied to the linked Supabase project on 2026-07-30.

Implemented:

- Removed merchant and authenticated platform-admin mutation policies from `store_subscriptions`.
- Reduced `authenticated` table privileges to `SELECT`; `anon` has no privileges and service-role server paths retain explicit DML access.
- Kept one scoped read policy for owners, store members, and platform admins.
- Added rollback-only RLS coverage plus a real owner-JWT live smoke proving self-upgrade, reactivation, period extension, insert, and delete all fail.
- Reconciled two live paid stores that had missing subscription rows from their latest paid invoice. The earlier count of one was stale.
- Added `supabase/tests/billing_subscription_consistency.sql` and `npm run test:db:billing-consistency`.
- Aligned operator analytics and merchant diagnostics with the shared effective subscription-status helpers.

Verification:

- live owner JWT: scoped read passed; all five mutation attempts were denied
- authenticated grant inventory: `SELECT` only
- live policy inventory: one authenticated `SELECT` policy only
- billing route smoke: passed
- checkout/manual review/callback regression suite: passed
- latest-paid invoice/subscription mismatch query: zero rows
- typecheck: passed

### P0.2 Move merchant gateway secrets out of `site_settings`

The Payment Settings UI currently accepts bKash app key, secret, username, and password, then saves the complete object from the browser into `site_settings`. There are no non-empty gateway fields in the live rows today, so this can be fixed before credentials are exposed.

Implementation:

1. Remove secret inputs from the general site-settings payload.
2. Add a server-only merchant payment-connection table patterned after secure courier credentials.
3. Add authenticated owner/admin server routes for write, rotate, revoke, and presence-only read.
4. Return only setup status and masked metadata to the browser.
5. Update storefront payment initialization to load credentials only on the server.
6. Add secret-isolation and cross-store authorization tests.

Done when:

- no bKash secret value can be selected through the browser client
- no secret is returned by a merchant settings read
- checkout still works using the secure server-side connection

### P0.3 Make courier multi-zone duplication real

The UI duplicates courier setups for multiple zones, but the live schema enforces `unique(store_id, provider)` and the POST route upserts on `store_id,provider`. A second Pathao zone overwrites the first.

Implementation:

1. Replace the uniqueness rule with connection identity that supports multiple rows per provider.
2. Make create use `INSERT`; keep edit scoped by `connection_id`.
3. Add a stable zone/service-area identifier and an appropriate uniqueness rule.
4. Preserve one secure credential row per connection.
5. Add tests for two Pathao connections in one store and for cross-store isolation.

Done when:

- one merchant can persist and independently edit two same-provider zones
- booking selects the intended connection
- duplicate creates a new row instead of overwriting the source

### P0.4 Restore green test and lint gates

Failing tests:

- trialing unpublished storefront access contract
- marketplace template safety should block detected merchant phone, email, payment identifiers, private assets, and custom code

Lint errors:

- conditional Hooks in `InviteCodes.tsx`
- `prefer-const` in courier booking

Implementation:

1. Restore the intended instant-live trial behavior or change onboarding and its test together; do not leave the contract ambiguous.
2. Treat merchant-data findings as marketplace blockers, not warnings that still produce `passed`.
3. Move conditional Hooks above early returns.
4. Resolve remaining hook dependency warnings.

Done when:

- typecheck, test, lint, and production build all pass from a clean install

### P0.5 Add a mandatory release gate

Current CI has database, preview, and secret-scan workflows, but no single required workflow runs typecheck, unit tests, lint, and production build together.

Implementation:

1. Add a `quality-gate` workflow for every pull request and `main` push.
2. Run `npm ci`, typecheck, tests, lint, build, and dependency audit.
3. Keep database and Playwright smoke workflows as separate required checks.
4. Upload test/build artifacts and server logs on failure.
5. Add a release checklist that records migration, Edge Function, environment, and live-smoke evidence.

Done when:

- a failing test or lint error cannot reach the launch branch

### P0.6 Harden analytics ingestion

The public analytics route accepts any event name and any valid store UUID through a service-role insert. This permits analytics poisoning and oversized/uncontrolled metadata.

Implementation:

1. Allowlist supported event names.
2. Confirm the target store is a valid public storefront.
3. Bound JSON body and metadata size.
4. Add durable/distributed rate limiting for production.
5. Validate product/order references against the same store when supplied.
6. Add retention and privacy rules for visitor/session identifiers.

Done when:

- invalid events, unpublished stores, cross-store entity references, and oversized metadata are rejected

### P0.7 Close remaining database advisor warnings

The live security advisor reports seven authenticated-callable `SECURITY DEFINER` functions, `pg_net` in the public schema, and an informational no-policy warning on the intentionally service-role-only courier credential table. Leaked-password protection is also reported, but it is not treated as a launch blocker while the project remains on a plan that does not include that control.

Implementation:

1. Review every advisor-listed function and revoke direct `EXECUTE` unless it is an intentional authenticated RPC.
2. For intentional helpers, bind the caller to `auth.uid()` and document why definer privileges are required.
3. Remove any remaining `PUBLIC` execute grants.
4. Move `pg_net` out of `public` when supported by the current managed project configuration.
5. Document the service-role-only courier credential table as an intentional RLS-with-no-client-policy design.
6. Reduce legacy anonymous table grants, including broad grants on `site_settings`, to the minimum operations the storefront actually uses.

Done when:

- every remaining security advisor item is fixed or explicitly documented with a tested reason

## P1 - Refine the core SaaS after P0

### P1.1 Finish billing maturity

- Add explicit downgrade confirmation and effective-date behavior.
- Define cancellation, renewal, failed-payment grace, reactivation, and domain removal behavior.
- Make provider callbacks idempotent and preserve raw provider event IDs.
- Add operator reconciliation for pending/stale invoices.
- Add credit/refund records instead of rewriting historical invoices.
- Run one positive live paid checkout and one positive manual-review loop.

### P1.2 Make backup/restore match the current platform

Current backup coverage includes core CMS, blog, catalog, orders, reviews, messages, addresses, analytics, access, and optional subscription data. It omits later entities such as:

- courier connections and shipment history
- secure credential presence/connection references
- notification history
- invoices and billing review metadata
- store domains
- recovery/campaign state

Refinement:

- move restore orchestration to a validated server-side job
- use a transaction or staged import with rollback
- version the backup schema and add compatibility migrations
- never export raw secrets; export connection placeholders requiring re-authentication
- add dry-run diff, restore summary, and integrity report
- execute one positive export and restore into a disposable store

### P1.3 Close courier live operability

- Create a safe sandbox/manual connection.
- Book one test shipment from an order.
- Verify connection selection, tracking persistence, order status, and failure handling.
- Add provider webhook/polling status reconciliation.
- Add cancellation, rebooking, returned parcel, COD reconciliation, and delivery-fee capture.
- Keep provider-specific validation and merchant guidance synchronized with adapter requirements.

### P1.4 Improve notification reliability

- Add provider message IDs, delivered/bounced status, retry count, and next retry time.
- Add template preview and test-recipient controls.
- Add a dead-letter/retry queue for transient failures.
- Add merchant-facing channel health and operator escalation.
- Execute positive tests for customer receipt and merchant alert.

### P1.5 Fix protected-route restoration UX

Cold admin navigation can remain on “Restoring dashboard access” long enough to look broken while permission queries recover.

- show a bounded countdown and actual retry action
- distinguish offline, expired session, permission timeout, and no-store states
- redirect expired sessions to login with a return URL
- use cached access immediately while revalidating safely
- add a hard-refresh Playwright test for representative admin routes

### P1.6 Consolidate admin information architecture

The product now has many capable screens. Reduce cognitive load:

- group daily operations, growth, storefront, logistics, and platform settings
- keep billing/security/credentials owner-only
- show feature availability consistently in sidebar, command menu, and direct routes
- add contextual “next action” links between launch, diagnostics, orders, courier, and notifications

## P2 - Growth and operating depth

### P2.1 Turn cart recovery into a real recovery system

- persist anonymous carts with consent-safe contact capture
- define abandonment windows
- schedule email/WhatsApp recovery sequences
- add recovery coupons, send history, attribution, and recovered revenue
- include opt-out, frequency limits, and privacy retention

### P2.2 Improve merchant intelligence

- add server-confirmed revenue/refund/net-sales events
- add product conversion, stock-out demand, repeat customer, cohort, and channel profitability
- add zero-result search recommendations
- add scheduled reports and anomaly alerts
- add analytics consent/settings and data retention controls

### P2.3 Complete domain and SEO operations

- run a positive custom-hostname activation and SSL smoke test
- expose DNS/SSL failure reasons and recheck controls
- verify canonical, sitemap, robots, social cards, and structured data on platform and custom domains
- add redirect strategy when primary domains change

### P2.4 Mature commerce operations

- returns/refunds/RMA workflow
- partial cancellation and partial refund
- stock adjustment ledger and low-stock purchasing workflow
- invoice/packing slip generation
- COD reconciliation and courier remittance tracking

## P3 - Add after launch stability

These are valuable additions, but should not delay P0/P1:

1. Customer segments and lifecycle automations.
2. Loyalty wallet and referral program with an auditable ledger.
3. Multi-location inventory and transfer orders.
4. Tax/VAT rules and compliant invoice numbering.
5. Merchant support inbox with SLA and escalation.
6. Platform audit log for every privileged operator action.
7. Public status page, error monitoring, tracing, and alerting.
8. App/integration marketplace for payment, courier, analytics, and messaging providers.

## Recommended implementation order

### Batch 1 - Security and release truth

1. Subscription RLS and grants
2. Secure merchant payment credentials
3. Security-definer and legacy grant cleanup
4. Analytics ingestion validation
5. Test/lint repairs
6. Required CI quality gate

### Batch 2 - P6 correctness

1. Multi-zone courier schema and create flow
2. Billing reconciliation and downgrade/cancel lifecycle
3. Backup schema v2 and server-side staged restore
4. Protected-route hard-refresh recovery

### Batch 3 - Positive live proofs

1. Paid billing loop
2. Manual billing review loop
3. Notification receipt and merchant alert
4. Courier connection and booking
5. Backup export and disposable restore
6. Cloudflare custom domain and SSL activation

### Batch 4 - Merchant refinement

1. Admin navigation consolidation
2. Cart recovery automation
3. Analytics intelligence and privacy controls
4. Returns/refunds and COD reconciliation

## Launch certification checklist

Launch only when all of these are true:

- no merchant can mutate subscription truth directly
- no gateway or courier secret is browser-readable
- all migrations are applied and security advisors have no unexplained warnings
- typecheck, tests, lint, build, database smoke, browser smoke, and secret scan pass
- billing, notification, courier, backup, and domain positive live loops have evidence
- invoice/subscription reconciliation reports zero mismatches
- tenant isolation tests cover every new store-scoped table and route
- rollback, recovery, monitoring, and operator ownership are documented
