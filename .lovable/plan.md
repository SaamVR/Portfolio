

# Expanding ThreadBD: Multi-Category Product Catalog and Premium Animations

## Overview

Transform ThreadBD from a T-shirt-only store into a full men's clothing brand while keeping T-shirts as the hero category. We'll add new product types (Polo, Shirts, Drop Shoulders, Undergarments, Pants) with a proper category system, and upgrade all animations to feel premium and smooth.

---

## Part 1: Expanded Product Data Model

### Update `Product` interface in `src/data/products.ts`

Add a `type` field to distinguish product types, keeping `category` for styling/tier:

```text
type: "T-Shirt" | "Polo" | "Shirt" | "Drop Shoulder" | "Undergarment" | "Pants"
```

Add ~12-15 new products across the new types, using the existing T-shirt images as placeholders (since we don't have real images for other types yet). Each product gets appropriate pricing, sizes, and descriptions relevant to Bangladesh.

### New product examples:
- **Polo**: Classic Pique Polo (Black, White) -- 1200-1400 BDT
- **Shirt**: Oxford Button-Down, Linen Casual -- 1500-1800 BDT
- **Drop Shoulder**: Oversized Drop Shoulder in various colors -- 1100-1300 BDT
- **Undergarment**: Cotton Vest, Boxer Briefs -- 350-500 BDT
- **Pants**: Joggers, Chinos, Cargo -- 1800-2500 BDT

---

## Part 2: Category Navigation Overhaul

### Update `src/pages/Shop.tsx`

- Replace the current flat category pills (Essentials/Street/Premium) with a **two-level filter**:
  - **Product type tabs** at the top: All, T-Shirts, Polos, Shirts, Drop Shoulders, Undergarments, Pants
  - Keep the tier sub-filter (Essentials/Street/Premium) as secondary pills
- Update URL params to support both: `?type=Polo&category=Premium`
- Dynamic page title based on selected type (e.g., "All Polos" instead of "All Tees")
- Show product count per type in the filter tabs

### Update `src/components/Navbar.tsx`

- Add a "Shop" dropdown or mega-menu showing product types as links (e.g., `/shop?type=Polo`)

### Update `src/components/MobileMenu.tsx`

- Add expandable product type links under "Shop"

---

## Part 3: Homepage Category Showcase

### Update `src/pages/Index.tsx`

- Add a **"Shop by Category"** section between the hero and featured products
- Grid of category cards with icons/illustrations linking to filtered shop views
- Each card shows the category name and a brief tagline

### Update `src/components/HeroSection.tsx`

- Change copy from "Handcrafted tees" to broader messaging: "Premium Menswear from Dhaka"
- Keep the streetwear vibe but make it inclusive of all product types

---

## Part 4: Premium Animation Upgrades

### New keyframes in `tailwind.config.ts`

- `blur-in`: Items fade in while deblurring (0 to sharp) -- premium Apple-style feel
- `slide-up-fade`: Combined translate + opacity with spring-like easing
- `stagger-in`: For grid items to cascade in sequence
- `shimmer`: Subtle gradient sweep for loading states and hover effects
- `float`: Gentle up-down float for decorative elements

### Update `src/hooks/useScrollReveal.ts`

- Add configurable animation variants (fade, blur-in, slide-left, slide-right)
- Add `rootMargin` for earlier trigger (items start animating before fully in view)
- Support staggered delays for grid children automatically

### Update `src/components/AnimatedSection.tsx`

- Accept an `animation` prop: "fade" (default), "blur", "slide-left", "slide-right"
- Each variant applies different keyframes for variety across sections

### Update `src/components/PageTransition.tsx`

- Upgrade from simple opacity fade to a blur + opacity + subtle scale transition
- Smoother easing curve (cubic-bezier for spring feel)

### Update `src/components/ProductCard.tsx`

- Add image shimmer/skeleton while loading
- Smooth image zoom on hover with overflow clip
- Subtle card lift effect (translateY + shadow increase) on hover
- Price text gets a gentle color pulse on hover

### Update `src/index.css`

- Add premium utility classes:
  - `.glass-effect` -- frosted glass background for overlays
  - `.shimmer-bg` -- animated gradient background
  - `.premium-shadow` -- layered multi-shadow for depth
  - `.smooth-hover` -- standardized hover transition timing

### Update `src/components/HeroSection.tsx`

- Add a parallax-style effect (subtle background movement on scroll using a lightweight scroll listener)
- Staggered text entrance with blur-in animation
- Floating decorative accent elements

### Update `src/components/FeaturedProducts.tsx`

- Wrap in AnimatedSection with staggered delays per card
- Add section entrance animation

---

## Part 5: Shop Page Visual Polish

### Update `src/pages/Shop.tsx`

- Animated filter transitions: products fade out/in when switching categories (layout animation)
- Product count indicator with animated number change
- Empty state with a subtle animation
- Grid items stagger in with increasing delays

---

## Files Summary

### Modified Files
| File | Changes |
|------|---------|
| `src/data/products.ts` | Add `type` field to interface, add ~15 new products across 5 new types |
| `src/pages/Shop.tsx` | Two-level filtering (type + category), animated transitions, dynamic title |
| `src/pages/Index.tsx` | Add "Shop by Category" section |
| `src/components/Navbar.tsx` | Shop dropdown with product types |
| `src/components/MobileMenu.tsx` | Expandable product type links |
| `src/components/HeroSection.tsx` | Updated copy, parallax effect, blur-in animations |
| `src/components/FeaturedProducts.tsx` | Staggered animation, section reveal |
| `src/components/ProductCard.tsx` | Shimmer loading, premium hover effects |
| `src/components/AnimatedSection.tsx` | Multiple animation variants |
| `src/components/PageTransition.tsx` | Blur + scale page transition |
| `src/hooks/useScrollReveal.ts` | Configurable variants, stagger support |
| `tailwind.config.ts` | New keyframes: blur-in, shimmer, float, stagger |
| `src/index.css` | Glass effect, shimmer, premium shadow utilities |
| `src/components/Footer.tsx` | Add links to new product categories |

### No New Files Needed
All changes fit within the existing component structure.

---

## Implementation Order

1. Product data model expansion (types + new products)
2. Tailwind keyframes and CSS utilities
3. Animation hook and component upgrades
4. Shop page filtering overhaul
5. Navbar and mobile menu updates
6. Homepage category showcase section
7. Hero section copy and animation upgrades
8. ProductCard and FeaturedProducts polish
9. Page transition upgrade

