# Final SaaS Readiness Audit - Commerce Engine

Audit date: 2026-07-08  
Scope: current working tree, Next.js App Router app, Supabase migrations/functions, merchant CMS/admin, storefront runtime, billing, email, tenant routing, and release readiness.

## Executive Verdict

Commerce Engine is no longer just a prototype. The core SaaS skeleton is present: multi-tenant stores, merchant signup, onboarding, storefront rendering, admin dashboard, plan entitlements, invoices, bKash-oriented billing routes, email functions, lifecycle jobs, media management, and platform control surfaces.

It is not ready to sell yet.

The product is closer than the previous architecture audit implied, but the remaining issues are high severity: payment endpoints trust client input, mock gateway code is reachable, custom domain ownership is not actually verified, one RLS repair migration appears to call `can_manage_store` with reversed arguments, and a tracked `.env` file exists in git. These are launch blockers for a paid SaaS.

Current readiness estimate: 72%.

Sellable MVP target: 90% after the Phase 0 and Phase 1 items below.

## Verification Snapshot

Commands run:

- `npm.cmd test` - passed, 23 tests.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed, generated 43 app routes.

Build note: `next build` loaded both `.env.local` and `.env`. Git currently tracks `.env`, even though `.gitignore` now ignores it. Treat any committed secrets as compromised.

## Implementation Status Update - 2026-07-08

Phase 0 code blockers are implemented in the current working tree:

- Repaired reversed `can_manage_store` RLS calls with a final policy-fix migration.
- Added a migration-time regression guard that fails if any live public policy still calls `can_manage_store(auth.uid(), ...)`.
- Locked billing checkout to authenticated store managers and server-derived plan pricing.
- Removed public mock bKash and debug store API routes.
- Hardened billing webhook/callback reconciliation around invoice, store, provider payment ID, and subscription updates.
- Locked custom-domain mutations to owner/admin store members with normalization, platform-domain blocking, and uniqueness checks.
- Removed `.env` from git tracking with `git rm --cached .env` and added `.env.example`; secrets still need rotation before production.

Phase 1 sellable-MVP items are now substantially implemented:

- `store_subscriptions` is the canonical subscription surface for checkout, callback, webhook, and free-plan changes.
- Billing UI supports plan comparison plus paid checkout and free-plan switching.
- Email/SMS delivery attempts are logged to `email_events`, and recent delivery events are visible in admin notifications.
- Order status changes now go through an authenticated store-scoped API route with transition rules.
- Store switching persists the active store and invalidates React Query caches without a full reload.

Phase 2 has started:

- The CMS page editor now shows saved/unsaved state, locally autosaves in-progress edits, offers local draft recovery, and confirms before a revision restore overwrites unsaved work.
- The dashboard go-live checklist now uses a shared tested readiness scorer and checks publish state, description, logo, products, featured products, payment, contact details, homepage sections, and information pages.
- Tenant storefront, custom CMS pages, tenant shop pages, and tenant product pages now generate App Router metadata with canonical URLs, Open Graph/Twitter images, page/product descriptions, store branding, and noindex metadata for unpublished stores.
- Tenant shop pages now use store-scoped product types/categories, visible in-page search, tested filtering/sorting logic, and avoid client-side SEO overrides on tenant routes.
- Checkout order creation now goes through a store-scoped API route backed by an atomic database RPC that server-derives product prices, decrements stock, claims coupons, and returns the existing order for duplicate idempotency keys.
- Tenant routing now has tested helpers for root domains, `www`, tenant subdomains, custom-domain lookup fallback, unknown domains, and platform path bypasses for `/admin`, `/api`, `/auth`, `/bkash`, `/plans`, `/signup`, and `/stores`.
- Newly verified custom domains now get a fresh uncached lookup retry after a cached miss, reducing post-verification routing delay without making every custom-domain request uncached.

## What Is Strong

- Next.js migration is buildable and deployable.
- Merchant signup now redirects to `/admin/onboarding?storeId=<id>`.
- Auth role loading waits for membership resolution, reducing admin data flashes.
- Admin layout has a store switcher and feature-gated dashboard areas.
- CMS page/block/theme schema is solid and has helper tests.
- Store-scoped products, orders, cart storage, categories, and storefront routes exist.
- Billing UI and invoice table now exist.
- bKash checkout/callback routes exist.
- Transactional email function and DB triggers exist.
- Lifecycle cron migration exists.
- Store member RLS was attempted across products, orders, settings, categories, types, and themes.
- Checkout now has server-side order creation, atomic stock decrement, coupon claim, authenticated customer attribution when available, and duplicate submit protection.
- Tenant proxy routing has regression tests for base domains, tenant subdomains, custom domains, unknown domains, and platform path bypasses.
- Custom-domain routing now does one uncached retry after a cached miss, giving newly verified domains a fast operational path before the normal revalidation window expires.
- Production build is clean.

## Phase 0 - Do Not Sell Before These Are Fixed

### 1. Fix reversed `can_manage_store` calls in latest RLS migrations

The function is declared as `can_manage_store(_store_id uuid, _user_id uuid)`, but newer migrations call it as `can_manage_store(auth.uid(), store_id)`.

Affected examples:

- `supabase/migrations/02_store_tenancy.sql:71` defines `_store_id, _user_id`.
- `supabase/migrations/20260704001500_fix_store_member_rls.sql:11` uses `auth.uid(), store_id`.
- `supabase/migrations/20260704002000_create_store_invoices.sql:26` uses `auth.uid(), store_id`.
- `supabase/migrations/20260704073000_fix_missing_rls_policies.sql:6` and later policies repeat the reversed order.

Impact: store managers, invoice access, and admin CRUD policies can silently fail or behave incorrectly because both arguments are UUIDs.

Implemented status:

- `supabase/migrations/20260708000000_fix_can_manage_store_policy_args.sql` drops and recreates the affected policies with `can_manage_store(store_id, auth.uid())`.
- `supabase/migrations/20260709000001_assert_can_manage_store_policy_args.sql` checks `pg_policies` during migration and fails if any live policy still contains `can_manage_store(auth.uid(), ...)`.

Remaining action:

- Keep `npm run test:db:rls` wired into local release checks and upcoming CI migration smoke runs.

### 2. Lock down billing checkout

`src/app/api/billing/checkout/route.ts` accepts `storeId`, `planId`, and `amount` from the request body, then uses the service role to create invoices.

Impact: any caller can attempt to create invoices for any store, choose any amount, or start payment flows without proving store ownership.

Action:

- Require Supabase auth on the route.
- Verify `can_manage_store(storeId, user.id)` before creating an invoice.
- Derive `amount`, `plan_id`, and currency from `cms_plans` server-side.
- Reject zero or tampered amounts for paid plans.
- Store provider payment IDs and reconcile them before activating subscriptions.

### 3. Authenticate real webhooks and remove demo payment trust

`src/app/api/billing/webhook/route.ts` accepts demo-shaped JSON and updates invoices/subscriptions with the service role. The mock gateway posts directly to it.

Affected examples:

- `src/app/api/billing/webhook/route.ts:21` says the payload is for demo purposes.
- `src/app/api/billing/mock-bkash/route.ts` is a publicly reachable mock payment page.
- `src/app/api/billing/checkout/route.ts:59` falls back to `/api/billing/mock-bkash` when credentials are missing.

Impact: a forged request can mark a subscription active if the route is deployed as-is.

Action:

- Remove or hard-disable `/api/billing/mock-bkash` in production.
- Require provider signatures, payment IDs, and idempotency checks.
- For bKash, treat callback execution as the source of truth, not arbitrary webhook JSON.
- Make activation update `store_subscriptions`, not only `stores`, and preserve invoice/subscription consistency.

### 4. Fix custom domain authorization

`src/app/api/domains/route.ts` has a `verifyStoreOwnership` helper, but the code comment says it only checks that the user is logged in.

Impact: any authenticated user could set or remove a domain for another store if they know the `storeId`.

Action:

- Verify membership role against `store_memberships`.
- Allow only owner/admin roles to change domains.
- Validate domain syntax, normalize lowercase, block platform/root domains, and enforce uniqueness.
- Add DNS verification state before routing traffic.

### 5. Remove tracked `.env` and rotate secrets

Git tracks `.env` even though `.gitignore` now ignores `.env`, `.env.local`, and `.env.production`.

Impact: any real Supabase, Firebase, Cloudinary, bKash, Resend, Vercel, or service-role secret ever committed should be treated as leaked.

Action:

- Remove `.env` from git history or at minimum from tracking with `git rm --cached .env`.
- Rotate all secrets that may have appeared in committed env files.
- Add `.env.example` with placeholder keys.
- Block env files in CI with a secret scanner.

### 6. Remove public debug route before production

`src/app/api/test-store/route.ts` returns error stack traces.

Impact: stack traces and internal store resolution details can leak in production.

Action:

- Delete the route or guard it behind `NODE_ENV !== "production"` and admin auth.

## Phase 1 - Sellable MVP Requirements

### 7. Make subscription state consistent

Some billing code updates `stores.subscription_status` and `stores.cms_plans_id`; other code reads `store_subscriptions`.

Action:

- Pick `store_subscriptions` as canonical.
- Update it in checkout/callback/webhook paths.
- Keep denormalized store fields only if triggers maintain them.
- Add tests for starter, trialing, active, past_due, cancelled.

### 8. Complete plan upgrade/downgrade UX

The billing page can pay the current plan but `Upgrade Plan` is still just a button with no flow.

Action:

- Add plan comparison inside admin billing.
- Support upgrade, downgrade, cancellation, renewal, invoice retry.
- Confirm plan changes with effective date and feature loss warnings.

### 9. Make email delivery observable

The email function and triggers exist, but the system needs operational evidence.

Action:

- Add `email_events` table with template, recipient, status, provider id, error, created_at.
- Make `send-email` idempotent for lifecycle/subscription events.
- Surface failed email events in platform admin.
- Add templates for welcome, store published, order placed, payment reminder, inactivity warning, deletion notice.

### 10. Harden order and checkout flows

Implemented status:

- `AdminOrders` passes `activeStoreId` into the order-status mutation.
- Order status changes require an authenticated store manager and enforce transition rules.
- Customer checkout uses `/api/orders/create` instead of direct browser inserts.
- Order creation validates store/product IDs, derives product price/name/image server-side, decrements stock in the same DB transaction, and returns the existing order for repeated idempotency keys.
- Coupon claim is folded into order creation so discounted orders, stock decrement, and usage counts succeed or fail together.

Remaining action:

- Add payment-aware stock release/refund handling for cancelled or failed prepaid orders.
- Add order-create integration tests against a local Supabase database.
- Decide whether COD should decrement immediately or reserve stock until confirmation for high-volume stores.

### 11. Strengthen storefront tenant routing

Proxy subdomain and custom-domain routing exists, and custom-domain lookup is cached for 5 minutes.

Implemented status:

- Production base-domain env names are documented in `.env.example`: `CMS_ROOT_DOMAIN`, `STORE_SUBDOMAIN_BASE_DOMAIN`, and their `NEXT_PUBLIC_` equivalents.
- Tenant routing helpers are now unit-tested for root domains, `www`, tenant subdomains, custom-domain resolver success/failure, unknown domains, and local development host handling.
- `/admin`, `/api`, `/auth`, `/bkash`, `/plans`, `/signup`, and `/stores` bypass tenant rewrites on tenant domains so platform/admin paths stay platform-owned.
- Custom-domain resolution now does a cached lookup first and one `cache: "no-store"` retry after a miss so newly verified domains can start routing without waiting for the full cache TTL.

### 12. Replace hard reload store switching

`StoreSwitcher` uses `window.location.reload()` to reset state.

Action:

- Persist active store in user preference or local storage.
- Scope all queries by active store.
- Reset React Query caches on store switch without full page reload.
- Add empty/loading states when a user has no store yet.

## Phase 2 - Product Polish And UX

### 13. CMS/editor usability

Action:

- Add autosave/draft status to CMS pages.
- Add block-level undo/redo.
- Add preview links per page and per store.
- Add empty states with next actions.
- Add media picker reuse everywhere images are selected.
- Add revision restore confirmation and diff preview.

### 14. Admin information architecture

Action:

- Tighten dashboard density and page hierarchy.
- Make mobile admin navigation production-grade.
- Add command menu actions for products, orders, pages, settings, media.
- Add consistent loading skeletons and error recovery panels.

### 15. Storefront UX

Action:

- Confirm tenant-aware nav is driven by store categories/pages, not hardcoded ThreadBD routes.
- Add product filtering, sorting, availability badges, search, and collection pages per store.
- Add SEO metadata per tenant page/product.
- Add OG image strategy per store.
- Add returns/privacy/terms pages per merchant.

### 16. Trust and onboarding

Action:

- Show a post-signup checklist tied to the real `store_id`.
- Add "go live" readiness checks: logo, payment method, at least one product, contact settings, published homepage.
- Add sample product seeding only as an explicit onboarding action.
- Add merchant help links and support escalation.

## Phase 3 - Scalability And Operations

### 17. Observability

Action:

- Add structured logs for API routes and edge functions.
- Track signup, onboarding completion, publish, first product, first order, subscription paid.
- Add error monitoring.
- Add payment and email dashboards in platform admin.

### 18. Data backup and restore

Action:

- Validate store backup/restore against real Supabase data.
- Add scheduled export or point-in-time restore plan.
- Add media backup rules for Cloudinary assets.
- Add tenant deletion workflow with grace period and audit trail.

### 19. Security baseline

Action:

- Add dependency auditing in CI.
- Add route-level authorization tests for every service-role API route.
- Add RLS regression tests for all tenant tables.
- Add rate limits for signup, checkout, domain changes, contact forms, auth bridge, and cloudinary signatures.
- Add CSP nonce/hash strategy; current CSP allows `unsafe-inline` and `unsafe-eval`.
- Remove console logging of sensitive failures before production.

### 20. CI/CD release discipline

Action:

- Require `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in CI.
- Add migration validation against a disposable Supabase database.
- Add preview deployment smoke tests for signup, onboarding, product create, checkout, and storefront publish.
- Add production launch checklist and rollback plan.

Implemented status:

- `.github/workflows/database-smoke.yml` now boots a disposable local Supabase stack in GitHub Actions, runs `supabase db reset --local`, exports local service-role credentials, and executes `npm run test:db` so CI uses the same combined RLS-plus-billing smoke gate as local release checks.
- `.github/workflows/preview-smoke.yml` now boots a local Supabase stack plus the Next app in GitHub Actions and runs a Playwright smoke path for `admin login -> merchant signup -> onboarding -> product create -> publish -> storefront load`.

## Suggested 4-Week Roadmap

### Week 1: Security launch blockers

- Fix reversed RLS policy calls.
- Lock billing checkout to authenticated store managers.
- Remove production mock payment route.
- Secure webhook/callback payment activation.
- Fix custom-domain ownership checks.
- Remove tracked `.env` and rotate secrets.
- Delete `/api/test-store`.

### Week 2: Billing and subscription loop

- Make `store_subscriptions` canonical.
- Finish upgrade/downgrade/cancel/retry flows.
- Add invoice idempotency and provider reconciliation.
- Add payment history accuracy and failure states.
- Add billing route tests.

### Week 3: Merchant success loop

- Add onboarding readiness checklist.
- Add transactional email observability.
- Add product/order/storefront smoke tests.
- Fix order status store scoping.
- Improve store switcher without hard reload.

### Week 4: Sellable polish

- Finish custom domain verification UX.
- Polish CMS page builder empty/error/loading states.
- Add tenant SEO/OG metadata.
- Add platform admin monitoring for payments, email, lifecycle, and signups.
- Run full preview deployment QA.

## Final Go/No-Go Checklist

No-go until all are true:

- No tracked env files or exposed secrets.
- All service-role routes authenticate and authorize the acting user or verify provider signatures.
- bKash payment activation cannot be forged.
- RLS policies pass tenant isolation tests.
- Signup to onboarding to publish works for a new merchant.
- Paid plan checkout creates an invoice, receives real payment confirmation, activates subscription, and sends receipt email.
- Custom domains cannot be claimed by the wrong merchant.
- Production build, lint, typecheck, tests, and migration smoke tests pass in CI.
- Mock/debug routes are removed from production.

Once Phase 0 and Phase 1 are complete, Commerce Engine should be viable as a paid beta for a small group of merchants. Phase 2 and Phase 3 are what make it feel polished, trustworthy, and scalable enough to sell more broadly.
