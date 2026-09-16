# R3 Lane B — Threads Secondary Storefront Pages Handoff

Branch: `r3/threads-secondary`
R3 coordination base: `711d67e5cc5f98cf39c9753adc6d6bb2eb2ec1e7`
Frozen R2 source: `a5b157e1555c802ddfcf4579c11afa25f82e0219`
Core implementation checkpoint: `d5203069d104da1aea54100befc4177c661cd8a6`

## Scope completed

Lane B aligned Threads secondary shopper surfaces to the existing editorial Threads homepage language without changing homepage ownership, Section Style registry/contracts, persistence semantics, schema/API architecture, or Generic/Fashion presentation.

Completed surfaces:
- `/shop` catalog plus category/collection browsing through the existing `?category=` state.
- `/shop?q=` search/results through the same authoritative catalog surface.
- Product detail presentation and its loading/not-found states.
- `/about` merchant brand-story presentation.
- `/contact` merchant contact/inquiry presentation.
- `/wishlist` Threads-specific saved-product presentation and states.
- `/faq` Threads-specific support presentation and states.
- Blog/Journal, returns, tracking, account/cart/checkout and other existing secondary flows inherit the Threads shell automatically through `StorefrontLayout`; no duplicate Threads-only business logic was introduced for them.

There are no separate category or collection routes in the current storefront architecture. Category/collection discovery is intentionally represented by `/shop` query state.

## Implementation notes

`StorefrontLayout` now reuses the already-existing specialized Threads shell only when the resolved storefront template is `threads`. Other templates remain on the pre-existing secondary-page shell path. This makes header, footer, cart, mobile navigation and theme language continuous between the Threads homepage and secondary routes.

The shop/catalog keeps existing product/search/filter/category truth and analytics. R3 changes are presentation-only: stronger editorial hierarchy, readable product metadata, 44px+ interactive controls, an intentional horizontally scrollable mobile category rail, and useful loading/empty states.

The product detail keeps existing variant/custom-metric selection, wishlist, inventory, cart, buy-now and related-product behavior. The final QA pass corrected the quantity control wrapper so its buttons render above the 44px minimum rather than losing height to the wrapper border.

About and Contact use merchant/store content only. No preview-only fake product, story, contact, inventory or category truth was added to production storefronts.

## Browser / responsive QA

Automated Chromium QA used the Threads preview store plus the real preview catalog in a temporary local-only harness. The harness was deleted before finalization. Full-page screenshots were captured under `/tmp/r3-threads-secondary-qa-final/` and manually inspected for the principal catalog, PDP, About and Contact compositions.

Machine-readable evidence is committed at:
`docs/handoffs/evidence/r3-threads-secondary-browser-qa.json`

Validated widths:
- 360 × 800
- 390 × 844
- 430 × 932
- 768 × 1024
- 1440 × 1000

Validated surfaces at every width:
- shop/catalog/search/category state
- product detail
- about
- contact
- FAQ
- wishlist

Results after the PDP touch-target correction:
- HTTP page response: 200 for every QA surface/viewport.
- document/body horizontal overflow: `0px` at every viewport.
- hard-clipped visible controls: `0` at every viewport.
- visible button/input/select/textarea controls below 44px: `0` at every viewport.
- the shop category tabs extend offscreen only inside their intentional `overflow-x-auto` mobile rail; they do not create body overflow or hard clipping.
- local `/api/analytics/track` can return 500 in the QA harness because the worktree intentionally has no real Supabase credentials. This is environment-only evidence; page rendering remains 200 and the untouched template preview had the same missing-environment limitation before the non-secret placeholder harness was used.

Representative screenshot files:
- `/tmp/r3-threads-secondary-qa-final/shop-390x844.png`
- `/tmp/r3-threads-secondary-qa-final/product-390x844.png`
- `/tmp/r3-threads-secondary-qa-final/about-390x844.png`
- `/tmp/r3-threads-secondary-qa-final/contact-390x844.png`
- `/tmp/r3-threads-secondary-qa-final/shop-1440x1000.png`
- `/tmp/r3-threads-secondary-qa-final/product-1440x1000.png`
- `/tmp/r3-threads-secondary-qa-final/contact-1440x1000.png`

## Validation

Targeted R3 + platform/product-truth suites passed 19/19 before final browser QA:
- `src/components/storefront/platform/StorefrontPlatformIntegration.contract.test.ts`
- `src/components/storefront/threads/ThreadsSecondaryPages.contract.test.ts`
- `src/lib/cms/storefront-product-presentation.test.ts`
- `src/lib/cms/storefront-shop-presentation.test.ts`
- `src/lib/storefront/storefront-product-truth.test.ts`

Final closeout result: typecheck passed, targeted ESLint passed, the targeted suite passed 19/19, and `git diff --check` passed.

## Lane C reusable-style requests

None required for R3 Lane B. Secondary-page work reuses existing Threads theme tokens, shell and product presentation contracts. No new canonical Section Style registry entry is needed from Lane C.

## Lane A integration dependency

Lane A should integrate this branch after/alongside the homepage work and preserve the specialized Threads shell routing for secondary pages. If Lane A changes `ThreadsShell`, `ThreadsHeader`, `ThreadsFooter`, or `StorefrontLayout` during integration, re-run the secondary-page browser matrix because those shared surfaces are the only meaningful integration seam.

Do not merge this lane directly into `r3/threads-redesign` from Lane B.
