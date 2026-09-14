# Fashion Storefront V2 — Implementation Contract

Date: 2026-09-11
Branch: `design/fashion-storefront-v2-foundations`
Production baseline at branch cut: `a66a5ae214cd1248c6759e4d13aaffbb26fbe2f6`

## Goal

Redesign EZComo's Fashion storefront as a substantially stronger ecommerce experience without changing the authority or semantics of catalog, inventory, pricing, cart, checkout, payment, order, customer, promotion, wishlist, or authentication logic.

The redesign must improve information architecture, navigation presentation, visual hierarchy, section order, product discovery, editorial storytelling, responsive behavior, PLP/PDP composition, and category-specific aesthetics while staying on the shared storefront engine.

## Reference policy

External storefronts are inspiration sources, not layout templates to copy.

Priority regional references include:

- Bongmade — https://bongmade.com/
- Channochara — https://channochara.in/
- weRbangali — https://shop.werbangali.com/

Use them to study visual language, campaign rhythm, merchandising, photography, typography, cultural identity, collection naming, UGC, and brand personality. Do not reproduce their page structure, copy, artwork, or distinctive trade dress.

The final EZComo hierarchy is derived from ecommerce best practice, shopper intent, UX laws, merchant configurability, and the existing EZComo block system.

## Authority boundaries

### Locked behavior

Do not change in Fashion V2 unless a separately governed bug fix requires it:

- product pricing authority
- inventory / availability authority
- discount calculation
- cart identity and variant semantics
- checkout state and payment behavior
- order creation and fulfillment
- customer identity / authentication
- merchant permissions and store scoping
- persisted merchant-authored page order unless the merchant explicitly applies a preset
- real reviews / ratings / proof data

### Presentation-owned behavior

Fashion V2 may change:

- navigation presentation
- header density and alignment
- hero composition
- block layout variants
- homepage section ordering when applying a preset
- whitespace / spacing rhythm
- typography hierarchy
- image ratios and crops
- product-card visual hierarchy
- PLP visual composition
- PDP visual composition
- CTA emphasis
- responsive stacking
- motion and hover treatment
- editorial / campaign storytelling

## UX law gate

Use these principles as design QA, not as decorative rules:

1. Jakob's Law — retain familiar ecommerce interaction conventions.
2. Hick's Law — reduce simultaneous high-priority choices.
3. Fitts's Law — keep important touch/click targets large and reachable.
4. Von Restorff Effect — one primary action should dominate each decision area.
5. Miller / chunking — group product, navigation, filter, and content choices meaningfully.
6. Proximity — visually associate related controls and facts.
7. Common Region — use containers only when they improve grouping clarity.
8. Similarity — equal interactions should look and behave consistently.
9. Prägnanz — prefer the simplest structure that communicates the hierarchy.
10. Aesthetic-Usability Effect — visual polish must reinforce clarity.
11. Serial Position Effect — prioritize important discovery and reassurance at useful positions.
12. Peak-End Rule — campaign moments and final reassurance should feel intentional.
13. Doherty Threshold — preserve fast feedback, loading, and interaction response.
14. Tesler's Law — system complexity should not be pushed onto shoppers.
15. Progressive Disclosure — defer secondary information until it is useful.
16. Goal Gradient — preserve clear progress toward product selection and purchase.
17. Occam's Razor — avoid redundant UI controls or duplicate content.
18. Pareto Principle — prioritize the product-finding and purchase actions most shoppers use.
19. Selective Attention — prevent promotions and secondary CTAs from competing with the current goal.
20. Cognitive Load management — show category-specific information, not every available fact everywhere.

## Ecommerce hierarchy principles

Fashion should support three primary product-finding paths:

1. direct navigation / categories / collections
2. search and filtering
3. curated or inspirational discovery

The redesign should make all three paths available without forcing the homepage to behave like a dense general marketplace.

Primary Fashion purchase attributes are usually higher priority than generic metadata. In the current EZComo data model this includes category, collection, size, color, fabric, fit, availability, and sale status.

## Fashion V2 layout presets

Presets are compositions of existing blocks. Applying a preset must not permanently couple the page to that preset.

### Editorial

Suggested flow:

1. Hero — `editorial`
2. Category Showcase — `masonry`
3. Rich Text — `brand-story`
4. Featured Products — `2-col`
5. Social Feed — `gallery`
6. Trust Badges — `cards`
7. Recently Viewed — optional
8. FAQ — optional

Purpose: premium photography-led storytelling with slower scanning and generous whitespace.

### Culture / Graphic

Suggested flow:

1. Hero — future `poster`
2. Category Showcase — `masonry`
3. Featured Products — `3-col`, newest source
4. Promo Banner
5. Rich Text — `brand-story`
6. Social Feed — `gallery`
7. Trust Badges
8. Recently Viewed — optional
9. FAQ — optional

Purpose: culturally expressive fashion, graphic apparel, artist collaborations, local-language brands, and collection-led merchandising.

### Boutique

Suggested flow:

1. Hero — `split`
2. Category Showcase — `cards`
3. Featured Products — `3-col`
4. Promo Banner — optional
5. Recommended Products — optional
6. Social Feed — optional
7. Trust Badges
8. Recently Viewed — optional
9. FAQ — optional

Purpose: balanced merchandising for general apparel merchants.

### Drop / Streetwear

Suggested flow:

1. Hero — `full-bleed`
2. Countdown — optional
3. Featured Products — `4-col`, newest source
4. Category Showcase — `carousel`
5. Video Reel — optional
6. Social Feed — optional
7. Trust Badges
8. Recently Viewed — optional
9. FAQ — optional

Purpose: limited drops, creator merchandise, frequent releases, and streetwear.

## Preset application safety contract

Applying a layout preset must follow these rules:

- existing block content is preserved;
- matching blocks are reordered and may receive a new `layoutVariant`;
- suggested props may populate a missing/empty field but must not silently overwrite merchant-authored content;
- missing required blocks may be added with safe empty/default props;
- optional blocks are not required to be created;
- extra merchant blocks are retained after the preset flow unless the merchant explicitly moves or deletes them;
- applying a preset must be previewable before publish;
- existing live stores are never auto-migrated merely because the template definition changed.

## Hero V2 direction

Existing variants remain supported:

- `full-bleed`
- `split`
- `centered`
- `editorial`

Candidate Fashion-oriented additions:

- `poster` — typography-led campaign composition
- `mosaic` — 2–4 image lookbook composition
- `collection-spotlight` — collection-led image/copy treatment

Do not add product binding to Hero in the first V2 slice. Product Spotlight can be achieved using Hero plus Featured Products until there is a strong cross-template reason for Hero-level catalog binding.

## Navigation direction

Do not create a separate Fashion navigation engine. Extend the shared navigation presentation.

Candidate presentation modes:

- Editorial — centered brand, minimal primary navigation
- Culture / Graphic — brand-left, collection-rich navigation and strong mega-menu image
- Boutique — conventional commerce hierarchy
- Drop — compact navigation with release / collection emphasis

Existing search, account, wishlist, cart, nested links, and category/type behavior remain authoritative.

## Category and product sections

Prefer stronger Fashion-specific styling of existing semantic variants before proliferating variant IDs.

Category Showcase:

- `masonry` → editorial / culture
- `cards` → boutique
- `carousel` → mobile-heavy / drops

Featured Products:

- `2-col` → editorial feature
- `3-col` → balanced boutique
- `4-col` → dense drop / larger catalog

## PLP direction

Do not rewrite the filtering/query engine in the first Fashion V2 pass.

Preserve current Fashion filtering semantics for category, collection, size, color, fabric, fit, availability, and sale.

Improve:

- collection/category introduction
- visible discovery hierarchy
- sort/filter placement
- desktop whitespace and density
- mobile filter/sort access
- active-filter visibility
- product-grid rhythm

## PDP direction

Do not create a new purchase engine.

Recommended desktop composition:

- 55–60% image/gallery area
- 40–45% sticky commerce panel

Commerce panel priority:

1. collection / product type
2. name
3. price / sale
4. genuine rating only when real data exists
5. color
6. size
7. size guide
8. availability
9. primary Add to Bag action
10. delivery / return reassurance from authoritative merchant settings

Recommended mobile order:

1. gallery
2. name / price
3. color
4. size
5. purchase action
6. product details

Below the core purchase area prioritize story, fabric/material, fit, care, policy/reassurance, real UGC where available, related products, and recently viewed.

## Truth contract

Fashion V2 must fail closed for social proof and commercial claims.

- no invented reviews
- no fabricated ratings
- no fake order/customer counts
- no invented press logos
- no unsupported delivery promises
- no unsupported return guarantees
- no fake scarcity
- no placeholder testimonial identity presented as real

When authoritative data is missing, simplify or hide the UI.

## Implementation sequence

### PR A — foundation

- typed layout-preset contract
- Fashion preset definitions
- preset safety tests
- Hero V2 variant contract and editor registration
- no PLP/PDP/navigation rewrite

### PR B — homepage presentation

- preset application helper
- Fashion-specific category / product / story / social styling
- editor apply/preview flow

### PR C — navigation

- build on the accepted shared navigation implementation after overlapping storefront work settles

### PR D — PLP

- hierarchy / styling only; query and filter authority locked

### PR E — PDP

- Fashion-specific composition; purchase semantics locked

### PR F — QA

- responsive validation
- keyboard / focus verification
- reduced-motion verification
- performance review
- visual golden updates

## Parallel-development boundary

At the time this branch was created, draft PR #305 overlaps with shared storefront block rendering, shop presentation, PDP presentation, and other merchant/admin UX work. Fashion V2 should not duplicate those changes.

The foundation branch therefore starts with isolated contracts and Hero/editor work. PLP/PDP/navigation changes should be rebased on the accepted shared storefront state once that lane settles.

## Validation requirements

At minimum:

- typecheck
- focused unit tests for layout presets
- storefront template tests
- editor variant persistence tests where affected
- mobile 390px visual check
- tablet 768px visual check
- desktop 1440px visual check
- no horizontal overflow
- no regression to cart / wishlist / quick-add / checkout paths
- no fabricated social proof or trust facts
- keyboard access to navigation, filtering, variant selection, and purchase actions
- reduced-motion-safe behavior for newly introduced motion
