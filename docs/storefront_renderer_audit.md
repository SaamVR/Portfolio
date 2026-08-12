# Storefront Renderer Audit

Updated: August 9, 2026

## Goal

Track which specialized storefront renderers still own real homepage behavior and which ones are close to becoming thin preset adapters over the shared block system.

## Current status

### Ready to thin down first

- `general-catalog`
  - Shared ownership already reduced for `rich-text` and `trust-badges`.
  - Remaining specialized value is mainly hero composition, catalog filtering rhythm, and mixed-catalog merchandising.
  - Good candidate for further extraction once hero/category/product composition presets are richer.

- `crafts`
  - Shared ownership already reduced for `rich-text` and `trust-badges`.
  - Remaining specialized value is mostly hero storytelling, artisan visual treatment, and catalog spotlight layout.
  - Good candidate for the next safe reduction pass after more preset defaults move into the shared layer.

### Mostly preset-driven already

- `digital-downloads`
  - Strong shared-block overlap for `rich-text`, `trust-badges`, and `testimonials`, but still uses them inside a specific creator/download framing.
  - Can likely become a thinner adapter once hero fallback copy and partner-stat framing move into shared presets.

- `subscriptions`
  - Similar to digital downloads: much of the content model is shared, but the renderer still assembles plan-specific proof and membership framing.

- `inquiry-catalog`
  - Relies on shared block types already, but still wraps them in quote-led messaging and inquiry-first CTA assumptions.

### Still meaningfully specialized

- `beauty`
  - Editorial pacing and storefront composition remain intentionally custom.

- `electronics`
  - Comparison-heavy layout and denser merch rhythm still justify specialization.

- `food`
  - Menu-style browsing and ordering cues are still custom enough to keep.

- `service`
  - Lead-capture and service-package framing still own homepage behavior.

- `booking`
  - Booking-first flow and testimonial/availability composition still own homepage behavior.

- `hotel`
  - Room discovery and hospitality framing still go beyond shared presets.

- `real-estate`
  - Listing-oriented search/discovery and trust framing still have real custom logic.

- `single-product`
  - Campaign-style composition still behaves like a specialized landing flow.

- `landing`
  - Marketing-style section assembly still intentionally owns the homepage.

## Safe shared-section reductions already made

- `crafts`
  - `rich-text`
  - `trust-badges`

- `general-catalog`
  - `rich-text`
  - `trust-badges`

## Next safe convergence order

1. Keep pushing fallback/default copy into the shared preset layer for:
   - `promo-banner`
   - `faq-accordion`
   - `trust-badges`
   - `testimonials`
   - `recommended-products`
   - `recently-viewed`
   - `comparison`
2. Reassess `digital-downloads` and `subscriptions` after shared preset coverage is broader.
3. Revisit `general-catalog` and `crafts` for hero/category/product preset extraction.
4. Only after that, trim renderer-side assumptions like `getSpecializedTemplateConsumedBlocks` more aggressively.
