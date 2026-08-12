# Storefront Templates — Complete Mobile Responsiveness Audit

> **Scope:** Frontend-only. No backend, database, or CMS logic is touched.  
> **Method:** Direct code-level review of all 6 renderer files + shared blocks.  
> **Status of previous audit:** Partially correct but missed Food, Electronics, Service, and Hotel templates entirely, and understated several issues.

---

## Global Issues (Apply to ALL Templates)

### 1. Section Padding Is Too Large on Mobile

Every renderer wraps sections with `py-12` or `py-14`. On mobile this is **48–56px top AND bottom** per section boundary. With 6–10 sections per page, **up to 1,120px** of the mobile scroll is blank background.

**Fix — replace on all section wrappers:**
```
Before: py-12 md:px-8 lg:px-10
After:  py-6 md:py-12 md:px-8 lg:px-10
```

### 2. Category Grids Always Collapse to 1 Column on Mobile

Every template uses `grid gap-4 sm:grid-cols-2 xl:grid-cols-N`. Below `640px` (most phones) that is **1 column**. For 6–8 categories this creates a disastrous tall stack.

**Fix — add `grid-cols-2` as the base for all category grids:**
```
Before: grid gap-4 sm:grid-cols-2 xl:grid-cols-4
After:  grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4
```
Also reduce the internal card padding on mobile: `p-5` → `p-3 sm:p-5`.

### 3. Testimonial / Review Cards Stack Vertically

All templates use `grid gap-5 lg:grid-cols-3` for review cards. 3 tall cards in a 1-column stack on mobile consume 3+ viewports.

**Fix — convert to horizontal scroll rail on mobile:**
```
Before: grid gap-5 lg:grid-cols-3
After:  flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory
        md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3
```
Each child card needs: `min-w-[85vw] shrink-0 snap-center md:min-w-0`

### 4. CTA Buttons Are `flex-col` on Mobile Without `w-full`

All hero CTA pairs use `flex flex-col gap-3 sm:flex-row`. The buttons are not `w-full` on mobile, so they appear as left-aligned narrow pills rather than full-width tap targets.

**Fix:**
```
Before: inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6
After:  inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 sm:w-auto
```

---

## Template 1: General Catalog (`GeneralCatalogStorefrontRenderer`)

### Hero Section
- `lg:grid-cols-[0.88fr_1.12fr]` stacks to 1-col on mobile — **text block first, then a large `aspect-[16/10.7]` image**. The image consumes ~55vw height on mobile.
- The inline search box inside the hero has `flex flex-col gap-3 sm:flex-row` — on mobile the search icon and input are stacked vertically, looks broken.

**Fixes:**
```
aspect-[16/10.7] → aspect-[2/1] md:aspect-[16/10.7]
pb-12 pt-8 → pb-6 pt-4 md:pb-12 md:pt-8
Search box: change from flex-col to flex-row always (the search icon + input should always be side-by-side)
```

### Confidence / Stats Strip (Line 468–490)
Grid: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`. Each stat card has `px-4 py-4`.
On mobile = 1 column, 4 stacked cards with large gaps.

**Fix:** `grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4` + reduce internal padding to `p-3 sm:p-4`.

### Promotional Cards (3-col grid, line 367)
`grid gap-5 xl:grid-cols-3` — 1 column on mobile. Each promo card has `p-6` internal padding.

**Fix:** `grid grid-cols-1 gap-4 sm:grid-cols-3` and reduce to `p-4 sm:p-6`.

### Trust Items / Why This Works Section (Line 498)
`grid gap-5 md:grid-cols-2 xl:grid-cols-3` — 1 column on mobile with `p-6` cards.
Between cards: `p-6 bottom` + `gap-5` + `p-6 top` = **68px dead space** per card boundary.

**Fix:** `grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3` + `p-4 md:p-6`.

---

## Template 2: Beauty (`BeautyStorefrontRenderer`)

### Hero Section — Collage Layout
Hero media uses `min-h-[420px] lg:min-h-[620px]` with **5 absolute-positioned product images**. On mobile (`< 1024px`) this renders as a 420px tall region where 5 images are scattered using percentage-based `left/top/right` values.

**Critical Issues:**
- Images at `left: 9%, top: 34%` and `right: 5%, top: 30%` overlap each other on viewports below 500px wide.
- The glass backdrop div `absolute inset-0 rounded-[40px]` is fully opaque at 70%, dimming all floating images into murky blobs on small screens.

**Fixes:**
```
min-h-[420px] → min-h-[240px] md:min-h-[420px] lg:min-h-[620px]
Add to the collage parent: hidden md:block (hide the floating collage)
Add a simple single-image fallback for mobile only:
  <div className="block md:hidden aspect-[4/3] overflow-hidden rounded-[24px]">
    <img src={heroProducts[0]?.image} ... className="w-full h-full object-cover" />
  </div>
```

### BeautyRail — Product Scroll Rail
This is actually **done correctly** — it uses `flex gap-4 overflow-x-auto` on mobile and switches to `lg:grid lg:grid-cols-5`. This is the pattern all other templates should copy. ✅

### Category Grid (Line 482)
`grid gap-4 sm:grid-cols-2 lg:grid-cols-6` — 1 column on mobile for up to 6 categories.

**Fix:** `grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-6`. Reduce card to `py-5 px-3`.

### Trust Strip (Line 455)
`grid gap-4 sm:grid-cols-2 lg:grid-cols-4` — OK at `sm` but still 1-col on XS.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4`.

### Bundle Deals (Line 519)
`grid gap-5 lg:grid-cols-3`. Each bundle card has a `grid grid-cols-3 gap-3` image grid inside with `h-40` product images. On mobile, 3 images at `h-40` within a card = very tall card.

**Fix:** `grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3` for outer grid. Inner product images: `h-28 md:h-40`.

### Testimonials (Line 596)
`grid gap-5 lg:grid-cols-3` — 1 col on mobile.

**Fix:** Convert to horizontal snap scroll rail (see Global Fix #3).

---

## Template 3: Real Estate (`RealEstateStorefrontRenderer`)

### Hero Section
Uses `aspect-[16/10.4]` for the hero image — reasonable. However the hero text column uses `pb-6 pt-8` and below it the `PropertySearchBar` adds another `pb-10`. Total mobile top zone: ~500px before first content section.

**Fix:** `pb-6 pt-8` → `pb-2 pt-4 md:pb-6 md:pt-8`. PropertySearchBar section: `pb-10` → `pb-6 md:pb-10`.

### PropertySearchBar
This is a custom component — needs its own audit. If it renders as a multi-field horizontal row, it will overflow on mobile. Recommend wrapping filters in a `grid grid-cols-2 gap-2` on mobile.

### Confidence Strip (Line 391)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-4` inside a rounded card. 1 col on mobile, each item has `px-4 py-4`.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4`.

### Category Types (Line 411)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-6` — 1 col on mobile for up to 6 property types.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6`. Reduce card padding: `p-5` → `p-3 sm:p-5`.

### Featured Listings (Line 439)
`grid gap-5 md:grid-cols-2 xl:grid-cols-4` — 1 col on mobile for property cards.

**Fix:** `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`. Property cards are content-rich so 1 column is acceptable here, but reduce gap: `gap-4 sm:gap-5`.

### Agents Grid (Line 512)
`grid gap-5 md:grid-cols-2 xl:grid-cols-4` — 1 col on mobile, agent cards are large.

**Fix:** Same horizontal snap rail pattern as testimonials for mobile.

### Testimonials (Line 531)
`grid gap-5 xl:grid-cols-3` — 1 col until 1280px. Only becomes multi-col on `xl`.

**Fix:** `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3` or horizontal rail for mobile.

### FAQ (Line 551)
`grid gap-4 lg:grid-cols-2` — 1 col on mobile, 6 FAQs stacked. Each `<details>` has `px-5 py-4`.

**Fix:** Reduce gap: `gap-2 md:gap-4`. Reduce padding: `px-4 py-3 md:px-5 md:py-4`.

### Lead Capture Banner (Line 473)
`grid gap-5 lg:grid-cols-[0.88fr_1.12fr]` — the promo image `aspect-[16/8.8]` shows on mobile below the text, adding massive height.

**Fix:** Hide the promo image on mobile: add `hidden md:block` to the image container div.

---

## Template 4: Food (`FoodStorefrontRenderer`)

### Hero Section — Food Collage
Media block uses `min-h-[350px] sm:min-h-[460px] lg:min-h-[520px]`. Inside it, there's a `grid lg:grid-cols-[1fr_170px]` — the right sidebar of 2 mini product cards only renders as a visible column on `lg`. On mobile all content stacks.

**Critical Issue:** The hero inner content uses `absolute inset-x-[7%] bottom-[8%] top-[11%]`. On mobile the `min-h-[350px]` minus 19% insets = content is crammed into ~280px. The `1fr` main dish image gets crushed. The mini sidebar cards disappear entirely (they're in the second grid column that doesn't show on mobile).

**Fixes:**
```
min-h-[350px] → min-h-[220px] md:min-h-[350px]
Hide the side column mini-cards on mobile:
  className="hidden lg:grid gap-4" (on the sidebar div)
Make the main dish image take full width on mobile by removing the grid on mobile
```

### Category Rail (Line 510)
`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7` — 1 col on mobile for up to 7 cuisines.

**Fix:** `grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7`. Category cards have `px-4 py-5` — reduce to `px-2 py-3 sm:px-4 sm:py-5` with smaller icon `h-12 w-12` → `h-10 w-10`.

### Product Rails (Popular Dishes & Chef Specials — Lines 593, 607)
These are **correctly implemented** — using `flex gap-4 overflow-x-auto` on mobile and `lg:grid lg:grid-cols-4` on desktop. ✅

### Info Cards / Delivery Section (Line 616)
`grid gap-4 px-5 py-6 lg:grid-cols-4` — 1 col on mobile. Each info card has `text-center` with icon + title + description. 4 cards stacked = very tall section.

**Fix:** `grid grid-cols-2 gap-3 md:grid-cols-4`. Reduce card padding: `px-3 py-4`.

### Combo Offer Cards (Line 538)
`grid gap-5 lg:grid-cols-2` — 1 col on mobile. Each combo has `grid sm:grid-cols-[1fr_200px]` inside. On mobile this renders as stacked: text above, then 2 product images below. Fine structurally, but the overall card height is very tall.

**Fix:** Reduce outer `gap-5` to `gap-4`. Reduce internal product images: `grid grid-cols-2 gap-2 sm:gap-3`.

---

## Template 5: Electronics (`ElectronicsStorefrontRenderer`)

### Hero Section — Collage Layout
Uses `min-h-[360px] sm:min-h-[460px] lg:min-h-[520px]` with `absolute inset-x-[9%] bottom-[9%] top-[16%]` inner layout. Inside: `grid gap-4 lg:grid-cols-[1fr_170px]`.

**Same issue as Food/Beauty:** On mobile the grid is 1 column and the right sidebar (2 mini product cards) are rendered below the main hero product image, making the total hero taller than expected.

**Fixes:**
```
min-h-[360px] → min-h-[220px] md:min-h-[360px]
Hide sidebar on mobile: add hidden lg:flex to the sidebar div
```

Also: The inline trust badges row (`mt-8 flex flex-wrap gap-3`) renders fine on mobile as they wrap naturally. ✅

### Category Cards (Line 489)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-4` — 1 col on mobile. Each card has `aspect-[16/10]` image area which is 60% of card height. 4 tall image cards stacked vertically.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4`. Reduce image area: `aspect-[16/10]` → `aspect-[4/3] sm:aspect-[16/10]`. Reduce inner padding: `px-5 py-4` → `px-3 py-3`.

### Featured Products Rail (Line 531)
**Correctly implemented** — `flex gap-4 overflow-x-auto` on mobile, `lg:grid lg:grid-cols-4`. ✅

### Countdown / Deal Banner (Line 543)
`grid gap-8 lg:grid-cols-[1.08fr_0.92fr]` — on mobile the timer grid `grid grid-cols-2 gap-3 sm:grid-cols-4` is well handled. ✅ However the banner's top padding `px-6 py-8` is large on mobile.

**Fix:** `px-5 py-6 md:px-8 md:py-8`.

### Comparison Section (Line 586)
`grid gap-5 xl:grid-cols-2` — 1 col until 1280px. Each comparison card has inner `grid gap-5 p-5 sm:grid-cols-[220px_1fr]`. On mobile the image area and specs are stacked.

The tech spec pills inside use `grid gap-3 sm:grid-cols-2`. On mobile these are a single-column list of spec badges which can be very long.

**Fix:** Limit specs to 4 on mobile using: `{compareSpecs.slice(0, 4).map(...)}` (already safe — no backend impact). Outer grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-2`.

### Accessories Grid (Line 663)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-4` — 1 col on mobile. Each accessory card has `aspect-[3/2]` image area.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4`. Image: `aspect-[4/3] sm:aspect-[3/2]`. Inner padding: `p-4` → `p-3 sm:p-4`.

---

## Template 6: Service (`ServiceStorefrontRenderer`)

### Hero Section
`grid gap-8 lg:grid-cols-[0.85fr_1.15fr]` — the hero image uses `aspect-[16/11]`. On mobile this is a tall image below a tall text block. The trust mini-cards inside the hero text use `grid gap-3 sm:grid-cols-3` — 1 col on mobile, 3 small cards stacked.

**Fixes:**
```
Hero image: aspect-[16/11] → aspect-[2/1] md:aspect-[16/11]
Trust mini-cards: grid grid-cols-3 gap-2 (always 3 cols — they're small enough)
pb-14 pt-8 → pb-6 pt-4 md:pb-14 md:pt-8
```

### Service Categories (Line 529)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-6` — 1 col on mobile. Each category has `p-5` internal padding and a `mt-5` heading — very tall.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6`. Reduce: `p-5` → `p-3 sm:p-5`, `mt-5` → `mt-3 sm:mt-5`.

### Pricing / Package Cards (Line 558)
`grid gap-5 xl:grid-cols-3` — 1 col until 1280px. Each pricing card has `p-6`. On mobile 3 large pricing cards stacked is very long.

**Fix:** `grid grid-cols-1 gap-4 sm:grid-cols-3`. Reduce: `p-6` → `p-4 sm:p-6`.

### Testimonials (Line 652)
`grid gap-4 lg:grid-cols-3` — 1 col on mobile.

**Fix:** Horizontal scroll rail (Global Fix #3).

### Team Members (Line 678)
`grid gap-5 md:grid-cols-2 xl:grid-cols-3` — each card has `aspect-[4/3]` avatar area. On mobile 3 tall cards are stacked.

**Fix:** `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3`. Avatar: `aspect-[4/3]` → `aspect-[3/2] sm:aspect-[4/3]`.

### FAQ Section (Line 717)
`grid gap-4 lg:grid-cols-2` — 1 col on mobile. FAQ buttons have `px-5 py-4`.

**Fix:** `gap-2 md:gap-4`. `px-4 py-3 md:px-5 md:py-4`.

---

## Template 7: Hotel (`HotelStorefrontRenderer`)

### Hero Section
`aspect-[16/11]` hero image — the same tall-image-below-text issue. Below the hero, `HotelBookingBar` adds `pb-12` more space. The total above-fold height on mobile is massive.

**Fix:**
```
aspect-[16/11] → aspect-[16/9] md:aspect-[16/11]
pb-12 (BookingBar section) → pb-6 md:pb-12
```

### HotelBookingBar Component
Likely contains date inputs and guest/room selectors in a horizontal row. On mobile this will overflow or compress badly if not already using a wrapped/grid layout. Needs responsive `grid grid-cols-2 gap-3` on mobile.

### Confidence Strip (Line 362)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-4` — 1 col on mobile.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4`. Internal `px-4 py-4` → `p-3 sm:p-4`.

### Room Categories (Line 383)
`grid gap-4 sm:grid-cols-2 xl:grid-cols-5` — 1 col on mobile.

**Fix:** `grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5`. Internal `p-5` → `p-3 sm:p-5`.

### Testimonials (Line 471)
`grid gap-5 xl:grid-cols-3` — 1 col until 1280px.

**Fix:** Horizontal scroll rail (Global Fix #3).

### FAQ (Line 491)
`grid gap-4 lg:grid-cols-2` — 1 col on mobile.

**Fix:** `gap-2 md:gap-4`. `px-5 py-4` → `px-4 py-3 md:px-5 md:py-4`.

### Promo Banner (Line 433)
`grid gap-5 lg:grid-cols-[0.82fr_1.18fr]` — promo image `aspect-[16/8.4]` shows below text on mobile.

**Fix:** Hide image on mobile: `hidden md:block` on the image container.

---

## Priority Matrix

| Priority | Issue | Templates Affected |
|---|---|---|
| 🔴 Critical | Hero collage bloat (420–520px tall) | Beauty, Electronics, Food |
| 🔴 Critical | Section `py-12` padding on mobile | All 7 templates |
| 🔴 Critical | Category grids collapsing to 1 col | All 7 templates |
| 🟠 High | Testimonials stacking vertically | All 7 templates |
| 🟠 High | CTA buttons not `w-full` on mobile | All 7 templates |
| 🟠 High | Tech spec lists untruncated on mobile | Electronics |
| 🟡 Medium | Trust strips 1-col on XS screens | All templates |
| 🟡 Medium | FAQ gap too large on mobile | Real Estate, Service, Hotel |
| 🟡 Medium | Promo banner images visible on mobile | Real Estate, Hotel |
| 🟢 Low | "View All" links hidden on mobile (sm:inline-flex) | Beauty, Food, Electronics |

---

## What the Previous Audit Got Right ✅
- The 68px dead-space calculation for Trust badge padding
- The horizontal scroll rail recommendation for testimonials
- The `aspect-ratio` shrink for hero images
- The `py-6 md:py-12` section padding fix

## What Was Missing ❌
- No audit of Food, Electronics, Service, or Hotel templates
- No mention of the Beauty/Food/Electronics hero collage collapse bug (worst issue)
- No mention of HotelBookingBar or PropertySearchBar responsiveness
- Promo image hiding on mobile not covered
- Team/Agent cards not covered
- CTA `w-full` fix on mobile not covered
