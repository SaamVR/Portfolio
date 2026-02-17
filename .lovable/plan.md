

# Newsletter Signup, Announcement Bar, and Experience Boosters

## Overview

Three additions to elevate ThreadBD: a newsletter signup in the footer, a site-wide announcement bar, and a few high-impact experience features.

---

## 1. Announcement Bar (Top of Site)

Create `src/components/AnnouncementBar.tsx` -- a slim, dismissible banner that sits above the navbar.

- Rotating messages with smooth crossfade (e.g., "Free Delivery on Orders Over 2000 BDT", "New Drop Shoulders Just Landed", "Pay with bKash for 5% Off")
- Auto-rotates every 4 seconds
- Dismissible with an X button (stores in sessionStorage so it stays hidden per session)
- Primary background with subtle shimmer animation
- Height: ~36px, fixed at the very top

**Integration changes:**
- Update every page layout (or create a shared `Layout` component) to offset `pt-16` to `pt-[100px]` when the bar is visible
- Better approach: Create a `src/components/Layout.tsx` wrapper used by all pages, containing AnnouncementBar + Navbar + Footer + the announcement-aware padding logic. This reduces duplication across 8+ page files.

## 2. Newsletter Signup in Footer

Update `src/components/Footer.tsx`:

- Replace the "Payment" column (move payment info to a one-liner below) with a **Newsletter** section
- Email input + "Subscribe" button styled with primary color
- Zod validation for email
- Success toast on submit
- Subtle "Join 5,000+ ThreadBD fans" social proof text
- Store subscribed state in localStorage to show "You're subscribed!" instead

## 3. Shared Layout Component

Create `src/components/Layout.tsx`:

- Wraps AnnouncementBar, Navbar, main content (children), and Footer
- Manages the dynamic top padding based on whether announcement bar is visible
- Replace manual Navbar/Footer usage in all page files (Index, Shop, About, Contact, FAQ, Cart, Checkout, Wishlist, ProductDetail, OrderSuccess)

## 4. Experience Boosters

### a. "Back to Top" Button
- Create `src/components/BackToTop.tsx`
- Floating button appears after scrolling 400px
- Smooth scroll to top on click
- Subtle fade-in/scale animation

### b. Recently Viewed Products
- Create `src/components/RecentlyViewed.tsx`
- Track viewed products in localStorage (max 8)
- Show a horizontal scrollable strip on the homepage below Featured Products
- Update `src/pages/ProductDetail.tsx` to record views

### c. "New" and "Sale" Badges on Product Cards
- Update `src/data/products.ts` to add optional `badge` field ("New" | "Sale") and `originalPrice` for sale items
- Update `src/components/ProductCard.tsx` to render colored badge overlays

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/AnnouncementBar.tsx` | Rotating dismissible promo banner |
| `src/components/Layout.tsx` | Shared page layout wrapper |
| `src/components/BackToTop.tsx` | Scroll-to-top floating button |
| `src/components/RecentlyViewed.tsx` | Recently viewed products strip |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/Footer.tsx` | Add newsletter signup section |
| `src/data/products.ts` | Add `badge` and `originalPrice` fields, mark some products as New/Sale |
| `src/components/ProductCard.tsx` | Render badge overlays, show crossed-out original price |
| `src/pages/Index.tsx` | Use Layout, add RecentlyViewed section |
| `src/pages/Shop.tsx` | Use Layout |
| `src/pages/ProductDetail.tsx` | Use Layout, record recently viewed |
| `src/pages/About.tsx` | Use Layout |
| `src/pages/Contact.tsx` | Use Layout |
| `src/pages/FAQ.tsx` | Use Layout |
| `src/pages/Cart.tsx` | Use Layout |
| `src/pages/Checkout.tsx` | Use Layout |
| `src/pages/Wishlist.tsx` | Use Layout |
| `src/pages/OrderSuccess.tsx` | Use Layout |
| `src/components/Navbar.tsx` | Adjust fixed positioning to account for announcement bar height |

### Implementation Order
1. Create Layout component with AnnouncementBar
2. Refactor all pages to use Layout
3. Add newsletter signup to Footer
4. Add badge system to products and ProductCard
5. Add BackToTop button
6. Add RecentlyViewed tracking and component
