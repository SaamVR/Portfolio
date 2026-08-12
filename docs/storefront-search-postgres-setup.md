# Storefront Search Without Third Parties

This rollout keeps product search entirely inside Supabase Postgres.

## What it adds

- `pg_trgm` for typo-tolerant matching
- GIN indexes for full-text search and trigram search
- `public.search_storefront_products(...)` for fast store-scoped search
- the existing storefront search API and UI now use this indexed Postgres path by default

## Apply the migration

Apply:

- [20260811101500_storefront_postgres_search.sql](/C:/Users/samvr/OneDrive/Desktop/AiProjects/COMMERCE%20Engine/supabase/migrations/20260811101500_storefront_postgres_search.sql)

## Why this is better than `%LIKE%`

- search is constrained by `store_id` and `is_available`
- full-text search uses a GIN index instead of scanning every product row
- typo tolerance comes from trigram similarity instead of raw wildcard scans
- the search function returns only ranked matches, not the whole table

## When to consider an external search engine later

Only revisit Typesense or Meilisearch if:

- very large per-store catalogs make Postgres ranking too expensive
- very high concurrent search traffic creates sustained database pressure
- you need advanced search features beyond this indexed keyword search
