# Worktree Batch Manifest

Last updated: August 11, 2026

## Purpose

This manifest separates the current mixed worktree into professional review and release buckets. It is meant to prevent unrelated changes from shipping together and to make cleanup predictable.

## Batch A: Scalability, caching, and deferred processing

Review pack:
- `docs/batch-a-scalability-review-pack.md`

Includes:
- `src/lib/cms/store-resolver.ts`
- `src/lib/cms/request-store.ts`
- `src/lib/storefront-cache-client.ts`
- `src/lib/orders/**`
- `src/lib/notifications/**`
- `src/lib/cart-recovery/**`
- `src/app/api/cache/**`
- `src/app/api/queues/**`
- `src/app/api/notifications/process-queue/**`
- `src/app/api/cart-recovery/process-queue/**`
- `src/app/api/orders/create/route.ts`
- `src/app/api/orders/status/route.ts`
- `src/app/api/notifications/test/route.ts`
- `src/app/api/notifications/retry/route.ts`
- `src/app/api/route-side-effects.test.ts`
- `src/app/storefront-shell-routes.test.ts`
- `vercel.json`
- `.env.example`
- related migrations:
  - `supabase/migrations/20260811143000_cart_recovery_delivery_processor.sql`
  - `supabase/migrations/20260811230000_notification_outbox_delivery.sql`
  - `supabase/migrations/20260811231010_notification_processor_runtime_config.sql`

## Batch B: Storefront search

Review pack:
- `docs/batch-b-storefront-search-review-pack.md`

Includes:
- `src/app/api/search/**`
- `src/app/api/storefront/products/search/**`
- `src/lib/storefront/**`
- `scripts/setup-storefront-search.ts`
- `docs/storefront-search-postgres-setup.md`
- `docs/storefront-search-typesense-setup.md`
- related migrations:
  - `supabase/migrations/20260811093000_storefront_search_sync.sql`
  - `supabase/migrations/20260811101500_storefront_postgres_search.sql`
  - `supabase/migrations/20260811124500_storefront_postgres_search_dedupe.sql`
  - `supabase/migrations/20260811133000_storefront_postgres_search_ranking.sql`

## Batch C: CMS editor and template restructuring

Review pack:
- `docs/batch-c-cms-editor-review-pack.md`

Includes:
- `src/views/admin/CmsPagesManager.tsx`
- `src/views/admin/CmsLibraryManager.tsx`
- `src/components/admin/cms-library/**`
- `src/components/storefront/editor/**`
- `src/components/admin/OnboardingWizard.tsx`
- `src/components/admin/HomepageSectionChoiceCard.tsx`
- `src/components/admin/StorefrontSectionStyleStudio.tsx`
- `src/lib/cms/page-templates.ts`
- `src/lib/cms/storefront-editor-registry.ts`
- `src/lib/cms/storefront-template-seeds.ts`
- `src/lib/cms/template-homepage-sections.ts`
- retired blueprint removals:
  - `src/app/templates/[blueprintId]/page.tsx`
  - `src/lib/cms/blueprint-pages.ts`
  - `src/lib/cms/page-blueprints.ts`
  - `src/lib/cms/store-blueprints.ts`
  - related tests/components removed with them

## Batch D: Platform operations and merchant admin

Review pack:
- `docs/batch-d-platform-ops-review-pack.md`

Includes:
- `src/views/admin/PlatformControlPlane.tsx`
- `src/views/admin/Billing.tsx`
- `src/views/admin/Categories.tsx`
- `src/views/admin/OnlineStoreHub.tsx`
- `src/views/admin/Products.tsx`
- `src/views/admin/SiteSettings.tsx`
- `src/lib/admin/**`
- `src/lib/platform/**`
- `src/lib/rate-limit.ts`
- `src/app/api/platform/**`
- `src/app/api/analytics/track/route.ts`
- related migrations:
  - `supabase/migrations/20260811150000_request_rate_limits.sql`
  - `supabase/migrations/20260811222744_fix_request_rate_limit_returning_count.sql`

## Batch E: Public marketing and informational pages

Review pack:
- `docs/batch-e-marketing-review-pack.md`

Includes:
- `src/app/how-it-works/**`
- `src/app/platform-faq/**`
- `src/components/marketing/**`
- `src/app/page.tsx`
- `src/app/plans/page.tsx`
- `public/images/guide/**`

## Batch F: Cloudflare and domain infrastructure

Review pack:
- `docs/batch-f-cloudflare-domain-review-pack.md`

Includes:
- `cloudflare/ezcomo-custom-domain-proxy/**`
- `scripts/backfill-domain-routing-kv.ts`
- `src/lib/domain-routing-kv.ts`
- `src/app/api/domains/route.ts`

## Batch G: Generated or local-only hygiene

Keep ignored or out of product review:
- `.tmp-smoke/**`
- `cloudflare/**/.wrangler/**`
- `knip-report.txt`
- `knip_report.txt`
- `lint-report.txt`

## Immediate repository standards

- Do not treat this branch as one deployable change set.
- Do not delete files solely from static analysis output.
- Keep temporary reports and smoke artifacts ignored.
- Keep infrastructure, storefront runtime, CMS editor, and marketing work in separate review batches.
