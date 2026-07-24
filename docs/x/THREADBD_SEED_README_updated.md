# ThreadBD all-template seed data

This package includes one published demo site for all 13 template IDs:

- landing_page
- beauty_personal_care
- fashion_catalog
- gadgets_electronics
- food_menu
- crafts_bengali_heritage
- single_product_launch
- inquiry_led_catalog
- service_based
- booking_based
- general_catalog
- subscriptions
- digital-downloads

The fixture is schema-agnostic because the exact live Supabase table and column
definitions were not supplied. It uses deterministic UUIDs and local
`/seed-assets/...` paths.

## Added demo storefronts

### AccessHub BD — `subscriptions`

Includes:

- AI tools
- SaaS and productivity plans
- streaming subscriptions
- cloud storage
- design tools
- VPN and security access
- duration and plan variants
- manual-renewal and digital-access metadata

### PixelVault BD — `digital-downloads`

Includes:

- templates
- fonts
- mockups
- photos
- icons and illustrations
- presets
- audio
- ebooks
- license variants
- protected download paths and signed-delivery defaults

## Recommended Codex task

Inspect the existing Supabase schema and current seed scripts first.

Use `threadbd_all_template_seed_data_updated.json` as the canonical fixture.
Map it to the existing tables; do not add duplicate tables or rename production
columns just to match the fixture.

Requirements:

1. Use deterministic IDs and idempotent upserts.
2. Insert in foreign-key order: stores, categories, products/services, media,
   variants, pages, page blocks, reviews, FAQs and template-specific records.
3. Attach every record to the correct `store_id` or `site_id` for tenant RLS.
4. Map subscription products to the existing plan, duration and digital-access model.
5. Map digital products to the existing protected download-delivery model.
6. Map inquiry products to `Request Quote`, not cart checkout.
7. Map booking services, staff and weekly availability, but create no customer bookings.
8. Use the local `/seed-assets` placeholders; do not fetch external images.
9. Do not seed auth users, orders, payments, credentials or real customer data.
10. Keep subscription credentials and digital download files private.
11. Add a reset command that deletes only these deterministic demo records.
12. Run lint, typecheck and database validation, then list every file/table changed.

## Mapping notes

- `product_type: "subscription"` uses `delivery_mode: "digital_access"`.
- Subscription duration and plan choices are stored as product variants.
- `product_type: "digital"` uses `delivery_mode: "digital_download"`.
- Digital files use placeholder paths under `/protected-seed-downloads/...`.
- Do not expose these paths directly in storefront markup.
- Map protected downloads to authenticated, expiring signed URLs after payment.
- The template ID is intentionally `digital-downloads` to match the storefront registry prompt.
