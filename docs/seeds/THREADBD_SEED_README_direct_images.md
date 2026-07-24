# ThreadBD all-template seed data — direct-image edition

This package contains one published demo site for all 13 template IDs:

- `landing_page`
- `beauty_personal_care`
- `fashion_catalog`
- `gadgets_electronics`
- `food_menu`
- `crafts_bengali_heritage`
- `single_product_launch`
- `inquiry_led_catalog`
- `service_based`
- `booking_based`
- `general_catalog`
- `subscriptions`
- `digital-downloads`

## What changed

- Replaced every local `/seed-assets/...` reference with a direct HTTPS image URL.
- Added unique category images, product images, service images and testimonial avatars.
- Added store-level fallback assets for hero, mobile hero, promotional, story, CTA, category and product visuals.
- Added image fields to homepage blocks so the renderer can populate hero, promotional, portfolio, story, team and other visual sections.
- Added complete `subscriptions` and `digital-downloads` demo stores.
- Added category- and product-specific specifications, variants, reviews and FAQs.
- Preserved deterministic UUIDs and the existing schema-agnostic fixture structure.

## Remote image hosts

The fixture uses:

- `loremflickr.com` for category-specific product, category, hero and section imagery.
- `placehold.co` for deterministic demo logos and neutral brand marks.
- `api.dicebear.com` for deterministic testimonial and team avatars.

These are demo fallbacks. Production stores should replace them with merchant-owned Cloudinary or CDN assets.

## Next.js image configuration

Add the remote hosts to `next.config.ts` or `next.config.js` when using `next/image`:

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "loremflickr.com" },
    { protocol: "https", hostname: "placehold.co" },
    { protocol: "https", hostname: "api.dicebear.com" },
  ],
},
```

## Files

- `threadbd_all_template_seed_data_direct_images.json` — canonical JSON fixture.
- `threadbd_all_template_seed_data_direct_images.ts` — TypeScript export of the same fixture.
- `threadbd_template_seed_adapter_direct_images.ts` — updated adapter based on the supplied current demo-data code.

## Recommended Codex task

Inspect the existing Supabase schema and seed scripts first.

Use `threadbd_all_template_seed_data_direct_images.json` as the canonical fixture. Map it to existing tables; do not create duplicate tables or rename production columns just to match the fixture.

Requirements:

1. Use deterministic IDs and idempotent upserts.
2. Insert in foreign-key order.
3. Attach every record to the correct tenant `store_id` or `site_id`.
4. Keep subscription activation data descriptive only; never seed real account credentials.
5. Keep digital product source files private and authorize downloads only after confirmed payment.
6. Map inquiry products to `Request Quote`, not ordinary cart checkout.
7. Map booking services, staff and availability, but create no customer bookings.
8. Do not seed auth users, orders, payments or real customer information.
9. Add a reset command that deletes only these deterministic demo records.
10. Run lint, typecheck, database validation and production build.

## Validation summary

- Templates: 13
- Categories: 52
- Products: 62
- Services: 12
- Unique direct visual URLs checked: 344
- Duplicate direct visual URLs: 0
- Remaining `/seed-assets/` paths: 0
