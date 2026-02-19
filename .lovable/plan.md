

# ThreadBD Admin Powerhouse + bKash + Multi-Image + SEO Upgrade

This plan covers 5 major feature areas, broken into phases for clean implementation.

---

## Phase 1: Manual bKash Integration

**How it works:** Admin sets their bKash number in the dashboard. At checkout, when a customer selects bKash, they see the merchant bKash number with instructions to "Send Money" and enter their Transaction ID (TrxID). The order is saved with status "pending_payment" and the TrxID for manual verification.

**Changes:**
- Add a `payment_settings` key to the `site_settings` table with fields: `bkash_number`, `nagad_number`, `bkash_enabled`, `nagad_enabled`
- New **Payment Settings** tab in Admin Site Settings page with fields to set bKash/Nagad merchant numbers
- Update `Checkout.tsx`: when bKash/Nagad selected, show the merchant number, "Send Money" instructions, and a TrxID input field
- Save `payment_trx_id` in the order's notes field
- Admin Orders page shows TrxID for verification

---

## Phase 2: Multi-Image Product Gallery

**Database changes:**
- Add `images` column (text array, default `'{}'`) to `products` table to store up to 5 image URLs
- Keep existing `image_url` as the primary/thumbnail image

**Admin Products page:**
- Add up to 5 image URL input fields in the Add/Edit Product dialog
- First image auto-populates `image_url` (main image)

**Product Detail page:**
- Replace single image with a gallery: large main image + thumbnail strip below
- Click thumbnails to switch the displayed image
- Smooth fade transition between images

---

## Phase 3: Robust Admin Dashboard

**Enhanced Dashboard stats:**
- Add total orders count, revenue, pending orders, recent orders list
- Quick links to common actions

**New admin features:**

### 3a. Category Management
- New admin page `/admin/categories` to manage product types and categories
- Store in `site_settings` with key `categories` (JSON array of `{label, value, tagline, icon}`)
- `CategoryShowcase` and Shop filter read from database instead of hardcoded array
- Admin can add/edit/delete categories

### 3b. Full CMS Site Settings Expansion
Add new tabs to the existing Site Settings page:
- **Contact Page**: edit address, phone, email, map placeholder text
- **FAQ Page**: add/edit/delete FAQ entries (stored as JSON array in `site_settings`)
- **SEO Settings**: site title, meta description, OG image URL, keywords
- **Payment Settings**: bKash/Nagad merchant numbers (from Phase 1)
- **Categories**: inline category management

---

## Phase 4: Live In-Page Content Editing

For the About, FAQ, and Contact pages:
- Fetch content from `site_settings` instead of hardcoded values
- About page reads `about_page` setting (title, content, values array)
- FAQ page reads `faq_entries` setting (array of Q&A pairs)
- Contact page reads `contact_page` setting (address, phone, email)
- Footer reads `footer` setting for about text
- Hero section reads `hero_section` setting
- Announcement bar reads `announcement_bar` setting (already partially done)

All pages fall back to sensible defaults when no database content exists yet.

---

## Phase 5: SEO Improvements

- Add a `SEOHead` component using `document.title` and meta tag manipulation via `useEffect`
- Each page sets its own title and meta description dynamically
- Product detail page sets product-specific OG tags (title, description, image)
- Add structured data (JSON-LD) for Product pages (name, price, availability, image)
- Admin SEO settings tab for global site title, description, OG image
- Update `index.html` with better base SEO tags
- Add canonical URL meta tags

---

## Technical Details

### Database Migration
```sql
-- Add images array to products
ALTER TABLE products ADD COLUMN images text[] NOT NULL DEFAULT '{}';
```

### New site_settings entries (seeded via insert)
- `payment_settings`: `{bkash_number, nagad_number, bkash_enabled, nagad_enabled}`
- `faq_entries`: `[{q, a}, ...]`
- `contact_page`: `{address, phone, email}`
- `categories`: `[{label, value, tagline}, ...]`
- `seo_settings`: `{site_title, meta_description, og_image, keywords}`

### Files to Create
- `src/components/SEOHead.tsx` - Dynamic meta tag manager
- `src/components/ProductImageGallery.tsx` - Multi-image gallery component

### Files to Modify
- `src/pages/admin/SiteSettings.tsx` - Add Payment, FAQ, Contact, SEO, Categories tabs
- `src/pages/admin/Products.tsx` - Multi-image fields in dialog
- `src/pages/admin/Dashboard.tsx` - Enhanced stats with orders/revenue
- `src/pages/ProductDetail.tsx` - Image gallery integration
- `src/pages/Checkout.tsx` - bKash/Nagad send-money flow with TrxID
- `src/pages/About.tsx` - Fetch content from database
- `src/pages/FAQ.tsx` - Fetch FAQ entries from database
- `src/pages/Contact.tsx` - Fetch contact info from database
- `src/components/AnnouncementBar.tsx` - Read from database settings
- `src/components/HeroSection.tsx` - Read from database settings
- `src/components/Footer.tsx` - Read from database settings
- `src/components/CategoryShowcase.tsx` - Read categories from database
- `src/components/admin/AdminSidebar.tsx` - Add Categories link
- `src/App.tsx` - Add categories route
- `index.html` - Better base SEO

### Execution Order
1. Database migration (add `images` column)
2. Seed new site_settings entries
3. Build SEOHead component + ProductImageGallery component
4. Update Admin Site Settings with all new tabs
5. Update Admin Products with multi-image
6. Update Admin Dashboard with enhanced stats
7. Update Checkout with bKash manual flow
8. Update storefront pages to read from database
9. Add SEO to all pages

