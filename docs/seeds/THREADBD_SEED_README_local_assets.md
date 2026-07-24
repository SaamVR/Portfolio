# ThreadBD Local Demo Assets

This bundle replaces remote placeholder/demo image URLs with local frontend assets under `public/demo-assets/`.

## Setup

1. Copy `public/demo-assets/` into your frontend `public/` folder.
2. Use `docs/seeds/threadbd_all_template_seed_data_local_assets.ts` or the JSON equivalent as your updated demo seed.
3. If your project imports the previous direct-image adapter, switch to `lib/cms/threadbd_template_seed_adapter_local_assets.ts` only if you need the renamed adapter file. The data shape itself is unchanged.
4. Seed image paths are root-relative, for example `/demo-assets/glowcare-bd/product-01.jpg`.

## Coverage

All 15 templates are covered:

- `landing_page` via `nexora-growth`: SaaS/platform/commerce growth visuals
- `beauty_personal_care` via `glowcare-bd`: skincare, cosmetics, and beauty product photography
- `fashion_catalog` via `urban-threads-bd`: fashion apparel, folded clothing, and editorial ecommerce imagery
- `gadgets_electronics` via `techhaven-bd`: headphones, phones, chargers, speakers, and clean tech imagery
- `food_menu` via `dhaka-bites`: appetizing restaurant, menu, and delivery food photography
- `crafts_bengali_heritage` via `banglar-karukaj`: Bengali heritage crafts, pottery, weaving, jute, and artisan visuals
- `single_product_launch` via `soundmax-launch`: premium flagship headphone launch visuals
- `inquiry_led_catalog` via `brandwear-wholesale`: wholesale apparel, samples, embroidery, and B2B packing visuals
- `service_based` via `vertex-creative`: agency/studio service business visuals
- `booking_based` via `style-studio-dhaka`: styling, salon, grooming, and appointment visuals
- `general_catalog` via `creator-market-bd`: mixed clean ecommerce product and category visuals
- `subscriptions` via `accesshub-bd`: SaaS, streaming, app, and membership subscription visuals
- `digital-downloads` via `pixelvault-bd`: creator tools, templates, files, and digital product mockups
- `hotel` via `harborview-stay-bd`: luxury hotel rooms, amenities, lobby, dining, and hospitality visuals
- `real-estate` via `greenroof-realty-bd`: property exteriors, interiors, amenities, and agent/listing visuals

## Validation

- Local image references checked: 785
- Missing local files: 0
- External image URLs remaining: 0

## Notes

The assets are generated as realistic ecommerce-style demo photography and stored locally. They are not runtime hotlinks and do not require loremflickr, dicebear, placehold.co, Cloudinary, or other external image services.
