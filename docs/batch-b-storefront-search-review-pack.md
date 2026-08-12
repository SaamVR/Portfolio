# Batch B Review Pack

Last updated: August 11, 2026

## Scope

This batch is the reviewable release slice for:
- public storefront product search,
- search index sync wiring,
- Postgres-first search ranking and deduplication,
- optional external search seam documentation.

## Exact Batch B Files In The Current Worktree

### Search API routes

- `src/app/api/search/storefront-sync/route.ts`
- `src/app/api/storefront/products/search/route.ts`
- `src/app/api/storefront/products/search/route.test.ts`

### Search library implementation

- `src/lib/storefront/storefront-product-search.ts`
- `src/lib/storefront/storefront-product-search.test.ts`
- `src/lib/storefront/storefront-products.ts`

### Search setup and operator docs

- `scripts/setup-storefront-search.ts`
- `docs/storefront-search-postgres-setup.md`
- `docs/storefront-search-typesense-setup.md`

### Required database migrations

- `supabase/migrations/20260811093000_storefront_search_sync.sql`
- `supabase/migrations/20260811101500_storefront_postgres_search.sql`
- `supabase/migrations/20260811124500_storefront_postgres_search_dedupe.sql`
- `supabase/migrations/20260811133000_storefront_postgres_search_ranking.sql`

## Neighbor Files To Leave Out Of Batch B

These were adjacent to storefront-related paths but are not part of the search release slice:

- `src/lib/storefront-cache-client.ts`
- `src/lib/storefront-buy-now.ts`
- `src/lib/storefront-buy-now.test.ts`
- `src/lib/storefront-customer-access.ts`
- `src/lib/storefront-customer-access.test.ts`

## Release Intent

Batch B should be reviewed and released as storefront search infrastructure and search UX support. It should not be mixed with:
- queue and deferred-processing rollout,
- CMS editor/template restructuring,
- marketing page changes,
- broad storefront runtime caching work outside search.

## Verification Baseline

Expected focused verification for this batch:

- `npm.cmd run lint`
- `npm.cmd run typecheck -- --pretty false`
- `npx.cmd tsx --test src/app/api/storefront/products/search/route.test.ts src/lib/storefront/storefront-product-search.test.ts`

## Deployment Notes

- Postgres-first search is the primary path for this batch.
- Any external search provider support should remain optional and non-blocking unless its environment is intentionally configured.
- Search migration rollout should be completed before expecting production search quality gains.
