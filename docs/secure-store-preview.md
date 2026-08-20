# Secure unpublished storefront preview

Store Preview is a short-lived merchant-only way to inspect a saved storefront before `stores.is_published` is enabled.

## Security model

- Preview sessions are created only by `POST /api/stores/preview-token` after an authenticated owner/admin/editor is confirmed for the requested store.
- The browser cannot insert into `store_preview_tokens`; the table is service-role only under RLS.
- Each token is scoped to one `store_id` and expires after 24 hours.
- The first `?preview=<token>` request is converted into a store-path-scoped HttpOnly cookie so normal storefront navigation does not expose the bearer token in every link.
- Each server route still passes the bearer token through the existing `validatePreviewToken(storeId, token)` database check. Cookie/header presence alone never bypasses publication state.
- Preview responses send `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store, max-age=0`, and `Referrer-Policy: no-referrer`.
- Unpublished stores are blocked by `/api/orders/create`, so previewing checkout cannot create a real order or reduce inventory.

## Activation

Apply `supabase/migrations/20260820084000_secure_store_preview_tokens.sql` to the production Supabase project before enabling production preview links.
