# Storefront Search Setup

This storefront search rollout uses:

- Typesense for typo-tolerant product search
- `POST /api/search/storefront-sync` for index updates
- a Supabase `pg_net` trigger on `public.products` for automatic sync

## 1. Set environment variables

Add these values to your deployment environment:

```env
TYPESENSE_PROTOCOL=https
TYPESENSE_HOST=your-typesense-host.example
TYPESENSE_COLLECTION_PRODUCTS=store_products
TYPESENSE_SEARCH_API_KEY=your_typesense_search_key
TYPESENSE_ADMIN_API_KEY=your_typesense_admin_key
STOREFRONT_SEARCH_WEBHOOK_SECRET=shared_search_sync_secret
```

## 2. Create the collection and backfill products

Run:

```bash
npm run storefront-search:setup
```

That script will:

- create the Typesense collection if it does not already exist
- load available products from Supabase
- upsert them into the search index

## 3. Apply the Supabase migration

Apply the new migration so product inserts, updates, and deletes trigger a sync:

- `supabase/migrations/20260811093000_storefront_search_sync.sql`

## 4. Set database settings for the trigger

The trigger reads two Postgres settings:

- `app.settings.storefront_search_sync_url`
- `app.settings.storefront_search_webhook_secret`

Set them in your database to the live app endpoint and the same shared secret:

```sql
alter database postgres
set app.settings.storefront_search_sync_url = 'https://your-domain.example/api/search/storefront-sync';

alter database postgres
set app.settings.storefront_search_webhook_secret = 'shared_search_sync_secret';
```

Reconnect your sessions after changing these settings.

## 5. What happens after setup

- storefront quick search and `/shop?q=...` queries use Typesense when configured
- detail pages, featured products, and non-search browsing continue using the existing product feed
- if Typesense is not configured or fails, the storefront falls back safely instead of breaking
