

# ThreadBD Store Upgrade -- UX, Animations, Search, and New Pages

This plan focuses on making the storefront more polished, accessible, and feature-rich. The admin panel will be added in a future phase with proper Supabase authentication.

---

## 1. Enhanced Navbar with Search Bar and Category Navigation

**What changes:**
- Add a search input with a search icon directly in the Navbar (desktop: inline; mobile: expandable icon toggle)
- Add category filter tabs/links below the Navbar or inline (Essentials, Street, Premium, All)
- Add a mobile hamburger menu (Sheet/drawer) with navigation links, categories, and search
- Improve accessibility: proper `aria-labels`, keyboard navigation, focus rings

**New files:**
- `src/components/SearchBar.tsx` -- reusable search input with debounced filtering
- `src/components/MobileMenu.tsx` -- slide-in mobile navigation using the existing Sheet component

**Modified files:**
- `src/components/Navbar.tsx` -- integrate SearchBar, category links, mobile menu trigger
- `src/pages/Shop.tsx` -- accept search query and category filter from URL params, filter products accordingly

---

## 2. New Pages

### About Page (`/about`)
- Brand story, mission, team/origin section
- Bangladesh-themed imagery and values

### Contact Page (`/contact`)
- Contact form (name, email, message) with Zod validation
- Store address, phone, social links
- Embedded map placeholder

### FAQ / Returns Page (`/faq`)
- Accordion-based FAQ using existing Radix Accordion component
- Covers shipping, returns, sizing, payment methods

### Order Confirmation Page (`/order-success`)
- Shown after checkout instead of redirecting to home
- Order summary, estimated delivery, "Continue Shopping" CTA

**New files:**
- `src/pages/About.tsx`
- `src/pages/Contact.tsx`
- `src/pages/FAQ.tsx`
- `src/pages/OrderSuccess.tsx`

**Modified files:**
- `src/App.tsx` -- add new routes
- `src/components/Navbar.tsx` -- add nav links for About, Contact
- `src/components/Footer.tsx` -- add links to About, Contact, FAQ
- `src/pages/Checkout.tsx` -- redirect to `/order-success` instead of `/`

---

## 3. Animations and Visual Polish

**Scroll-triggered fade-in animations:**
- Create a reusable `useScrollReveal` hook using `IntersectionObserver` (no external library needed, great performance)
- Apply to product cards, section headings, and page sections for staggered entrance effects

**Micro-interactions:**
- Add to Cart button: brief scale pulse on click
- Size selector: smooth background transition
- Cart badge: pop-in animation when count changes
- Page transitions: fade-in on route change using a wrapper component

**New keyframes in `tailwind.config.ts`:**
- `scale-pop` -- quick scale up/down for button feedback
- `slide-up` -- for page entrance
- `bounce-in` -- for cart badge

**New files:**
- `src/hooks/useScrollReveal.ts` -- IntersectionObserver-based reveal hook
- `src/components/AnimatedSection.tsx` -- wrapper that applies scroll reveal to children
- `src/components/PageTransition.tsx` -- fade-in wrapper for route changes

---

## 4. Accessibility Improvements

Across all components:
- Add `aria-label` to all icon-only buttons (cart, back, quantity controls, remove)
- Add `role` attributes where needed (navigation, search)
- Ensure all interactive elements are keyboard-focusable with visible focus rings
- Add `alt` text improvements for product images (include product name + color)
- Add skip-to-content link at the top of the page
- Ensure proper heading hierarchy (h1 > h2 > h3) across all pages
- Add `aria-live="polite"` region for cart count updates and toast announcements

**Modified files:**
- `src/components/Navbar.tsx` -- aria-labels, skip link, role="navigation"
- `src/components/ProductCard.tsx` -- better alt text, focus styles
- `src/pages/ProductDetail.tsx` -- aria-labels on size buttons, quantity controls
- `src/pages/Cart.tsx` -- aria-labels on all buttons
- `src/index.css` -- add a `.sr-only` utility if not present, focus-visible styles

---

## 5. Shop Page Filtering and Search Logic

- Products filterable by category (via URL query param `?category=Street`)
- Products searchable by name (via URL query param `?q=olive`)
- Combine both filters simultaneously
- Show "No products found" state with a clear-filters button
- Category pills at the top of the shop page with active state styling

**Modified files:**
- `src/pages/Shop.tsx` -- full rewrite of filtering logic using `useSearchParams`

---

## Summary of All New Files

| File | Purpose |
|------|---------|
| `src/components/SearchBar.tsx` | Debounced search input |
| `src/components/MobileMenu.tsx` | Mobile navigation drawer |
| `src/components/AnimatedSection.tsx` | Scroll-reveal wrapper |
| `src/components/PageTransition.tsx` | Route transition wrapper |
| `src/hooks/useScrollReveal.ts` | IntersectionObserver hook |
| `src/pages/About.tsx` | Brand story page |
| `src/pages/Contact.tsx` | Contact form page |
| `src/pages/FAQ.tsx` | Accordion FAQ page |
| `src/pages/OrderSuccess.tsx` | Post-checkout confirmation |

## Summary of Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add 4 new routes, wrap routes in PageTransition |
| `src/components/Navbar.tsx` | Search bar, category links, mobile menu, accessibility |
| `src/components/Footer.tsx` | Add links to new pages |
| `src/components/ProductCard.tsx` | Scroll animation, better a11y |
| `src/pages/Shop.tsx` | URL-based search + category filtering |
| `src/pages/Cart.tsx` | Accessibility labels |
| `src/pages/ProductDetail.tsx` | Accessibility labels, micro-animations |
| `src/pages/Checkout.tsx` | Redirect to /order-success |
| `src/index.css` | Skip-link styles, focus-visible |
| `tailwind.config.ts` | New keyframes (scale-pop, slide-up, bounce-in) |

## Implementation Order

1. Tailwind keyframes and CSS utilities (foundation)
2. Reusable hooks and animation components
3. SearchBar and MobileMenu components
4. Updated Navbar with search, categories, mobile menu
5. Shop page filtering logic
6. New pages (About, Contact, FAQ, OrderSuccess)
7. Updated routes in App.tsx and Footer links
8. Accessibility pass across all components

