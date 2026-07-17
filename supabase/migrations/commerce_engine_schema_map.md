# Commerce Engine Schema Map

Supabase migrations must stay chronological in `supabase/migrations`, so this file is the organized CMS map for the current direction.

For cleaned, purpose-based SQL packs, use `supabase/schema/sql/`.

## Platform CMS

- `cms_plans`: public package definitions for Basic, Advanced, and Pro.
- `cms_signup_leads`: pre-sales/signup interest before a full workspace exists.
- `user_roles`: platform-level roles, reserved for engine operators.

## Tenant Ownership

- `stores`: one tenant storefront/workspace.
- `store_memberships`: per-store staff access.
- `store_staff_invites`: claimable tenant invite codes that become store memberships.
- `store_subscriptions`: active package for each store.
- `store_themes`, `store_pages`, `store_page_blocks`, `store_page_revisions`: storefront CMS content owned by a store.

## Store-Scoped Commerce

The forward migration adds `store_id` to legacy single-store commerce tables:

- `products`
- `orders`
- `cart_items`
- `coupon_codes`
- `product_categories`
- `product_types`
- `product_reviews`
- `product_qa`
- `stock_notifications`
- `contact_messages`
- `customer_addresses`
- `site_settings`

The default demo tenant is `00000000-0000-4000-8000-000000000001`.

## Edge Function Attention

- `bkash-payment` must resolve payment settings by `store_id` before falling back globally.
- `sitemap` must generate platform URLs plus tenant storefront URLs.
- `stock-notifications` should use store-aware sender/copy instead of hard-coded platform branding.

## Organized SQL Packs

- `supabase/schema/sql/01_platform_core.sql`
- `supabase/schema/sql/02_store_tenancy.sql`
- `supabase/schema/sql/03_storefront_cms.sql`
- `supabase/schema/sql/04_store_scoped_commerce.sql`
- `supabase/schema/sql/05_functions_and_policies.sql`
- `supabase/schema/sql/06_seed_defaults.sql`
