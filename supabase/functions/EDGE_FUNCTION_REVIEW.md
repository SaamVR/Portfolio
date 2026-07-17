# Edge Function Review

Reviewed during the Commerce Engine CMS pivot.

## Updated

- `bkash-payment`
  - Removed hard-coded platform fallback origin.
  - Uses `CMS_PUBLIC_URL` and comma-separated `ALLOWED_ORIGINS`.
  - Resolves `store_id` from payload or order number.
  - Reads tenant-scoped `site_settings.payment_settings`, with a global fallback for migration safety.
  - Applies payment confirmation to the matching tenant order when `store_id` is known.

- `sitemap`
  - Treats `/` as the CMS/platform landing page.
  - Adds `/plans`, `/signup`, and `/admin/login`.
  - Emits tenant storefront URLs from `stores`, `store_pages`, and product records.

- `stock-notifications`
  - Removed hard-coded sender/copy.
  - Uses `STOCK_EMAIL_FROM`.
  - Filters notification recipients by `store_id` when present.
  - Uses the store name in email content.

- `merchant-signup`
  - Added as the merchant self-registration path.
  - Creates `stores`, `store_memberships`, and `store_subscriptions`.
  - Auth signup now resumes pending workspace creation after email verification/login.

- `claim-invite-code`
  - Checks `store_staff_invites` first.
  - Creates `store_memberships` for tenant staff access.
  - Falls back to legacy platform `invite_codes` only for engine-operator workflows.

- `cloudinary-signature`
  - Prefixes media folders as `stores/{slug}/{folder}`.
  - Accepts `store_id` from callers.
  - Allows authenticated review uploads while keeping store-management checks for admin media.

## Remaining Notes

- `admin-setup` is intentionally still platform-admin oriented. That is useful for operating the CMS itself, but it is no longer the merchant signup path.
- The client-side merchant signup form is hydrated in-browser, so plain HTTP smoke checks only confirm route availability, not the hydrated field state.
