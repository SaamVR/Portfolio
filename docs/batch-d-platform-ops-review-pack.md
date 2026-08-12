# Batch D Review Pack

Last updated: August 11, 2026

## Scope

This batch is the reviewable release slice for:
- platform control-plane operations,
- merchant admin and platform oversight surfaces,
- platform billing and subscription admin routes,
- analytics ingestion hardening,
- request rate limiting and related runtime safeguards.

## Exact Batch D Files In The Current Worktree

### Admin and platform surfaces

- `src/views/admin/PlatformControlPlane.tsx`
- `src/views/admin/Billing.tsx`
- `src/views/admin/Categories.tsx`
- `src/views/admin/OnlineStoreHub.tsx`
- `src/views/admin/Products.tsx`
- `src/views/admin/SiteSettings.tsx`

### Platform and admin library changes currently in the diff

- `src/lib/admin/admin-navigation.ts`
- `src/lib/admin/merchant-ops.ts`
- `src/lib/platform/admin-analytics.ts`
- `src/lib/platform/audit-logger.ts`
- `src/lib/platform/request-host.ts`
- `src/lib/platform/request-host.test.ts`
- `src/lib/rate-limit.ts`

### Platform and analytics API routes currently in the diff

- `src/app/api/analytics/track/route.ts`
- `src/app/api/platform/billing/manual-review/route.ts`
- `src/app/api/platform/payment-connections/bkash/route.ts`
- `src/app/api/platform/subscriptions/route.ts`

### Required migrations

- `supabase/migrations/20260811150000_request_rate_limits.sql`
- `supabase/migrations/20260811222744_fix_request_rate_limit_returning_count.sql`

## Neighbor Files That Belong To This Domain But Are Not In The Current Dirty Diff

These files are part of the same platform/admin area, but they should only be pulled into Batch D if their diffs are intentionally needed:

- `src/lib/admin/merchant-growth-settings.ts`
- `src/lib/platform/admin-analytics.test.ts`
- `src/lib/platform/control-plane.ts`
- `src/lib/platform/control-plane.test.ts`
- `src/lib/platform/global-settings.ts`
- `src/lib/platform/rbac.ts`
- `src/lib/platform/site-config.ts`
- `src/lib/platform/store-readiness.ts`
- `src/lib/platform/store-readiness.test.ts`
- `src/lib/platform/support.ts`
- `src/lib/platform/support.test.ts`
- `src/app/api/platform/access/route.ts`

## Release Intent

Batch D should be reviewed and released as platform operations and merchant-admin hardening. It should not be mixed with:
- storefront resolver and queue work,
- storefront search rollout,
- CMS/editor migration work,
- public marketing page changes.

## Verification Baseline

Recommended focused verification for this batch:

- `npm.cmd run lint`
- `npm.cmd run typecheck -- --pretty false`
- targeted tests relevant to this area, especially:
  - `src/app/api/route-auth.test.ts`
  - `src/app/api/route-side-effects.test.ts`
  - `src/lib/platform/request-host.test.ts`

## Deployment Notes

- This batch contains operational and policy-sensitive behavior, so production rollout should verify auth boundaries and rate-limit behavior, not just compilation.
- The request-rate-limit migrations should be applied before expecting the runtime limiter changes to behave correctly in production.
