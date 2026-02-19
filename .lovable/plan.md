
# Full Shopper Experience & Admin Panel Audit + Improvements

## Audit Findings

### As a Shopper — What's Missing or Could Be Better

**Cart & Checkout:**
- The Cart page checkout button says "Checkout with bKash" but COD is also supported — misleading copy
- No coupon/discount code field at checkout
- No delivery fee calculation (it just says "Free" always, even if not always true)
- No "Continue Shopping" link on the Cart page
- Order Success page has no "Track Order" link — users must manually go to /track-order

**Shop / Product Discovery:**
- No price range filter (slider) on the Shop page
- No color filter on the Shop page
- Product cards show no size availability info
- No "Back to top" visible shortcut on long Shop pages (BackToTop component exists but may need checking)
- No "Sale" filter shortcut

**Product Detail Page:**
- No stock count shown (e.g. "Only 3 left!") — only low stock indicator exists internally but isn't shown to user
- No "Add to Wishlist" confirmation toast visible on product card (only on detail page)

**General UX:**
- No mobile sticky bottom navigation bar (Home / Shop / Cart / Wishlist / Account) — very common for mobile-first stores
- No "Track Order" link visible on the Order Success page for immediate follow-up
- Cart checkout button text is misleading

### Admin Panel — What's Missing

**No contact message inbox** — the `contact_messages` table exists in the DB with an `is_read` field, but there is NO admin page to read or manage customer messages. This is a significant gap.

**No coupon/discount code system** — there's no way for admins to create promotional codes that shoppers can apply at checkout.

**No delivery fee configuration** — the checkout always shows "Free", but there's no admin setting to configure delivery fees by city or order amount threshold.

---

## Plan: What Will Be Built

### 1. Shopper Improvements

**A. Order Success Page — Add "Track Order" link**
- Add a third CTA button to the order success page linking to `/track-order?order=${orderNumber}` so customers can immediately track their order

**B. Cart Page — Fix misleading button text**
- Change "Checkout with bKash" to just "Proceed to Checkout"

**C. Shop Page — Add Price Range Filter**
- Add a simple min/max price filter row below the existing category/tier filters using two number inputs or a range approach
- This will filter `filtered` array by price range

**D. Mobile Bottom Navigation Bar**
- New component `MobileBottomNav.tsx` — a fixed bottom bar for mobile (hidden on md+) showing: Home, Shop, Cart (with badge), Wishlist (with badge), Account
- Integrated into the main `Layout.tsx`

**E. Stock Level Badge on Product Cards**
- If `stock` is low (≤ 5 and > 0), show a small "Only X left" tag on the product card image

### 2. Admin Panel Additions

**A. Contact Messages Inbox (`/admin/messages`)**
- New page `src/pages/admin/Messages.tsx`
- Lists all messages from `contact_messages` table
- Shows name, email, message preview, date
- Click to expand/read full message
- Mark as read (updates `is_read` field)
- Unread count badge on sidebar link
- Route added to `App.tsx`
- Sidebar link added to `AdminSidebar.tsx`

**B. Delivery Fee Settings (in Site Settings)**
- Add a new "Delivery" tab to `SiteSettings.tsx`
- Fields: free delivery threshold (e.g. orders over ৳2000 = free), standard delivery fee (e.g. ৳80), and a toggle to enable/disable fee entirely
- Store in `site_settings` table under key `delivery_settings`
- The `Checkout.tsx` will read this setting and calculate real delivery fee instead of hardcoding 0
- The `Cart.tsx` order summary will also reflect this

**C. Coupon Code System**
- New DB table: `coupon_codes` — fields: `code`, `discount_type` (percentage | fixed), `discount_value`, `min_order`, `max_uses`, `uses_count`, `expires_at`, `is_active`
- New admin page `src/pages/admin/Coupons.tsx` — create/edit/delete coupons, see usage count
- Sidebar link added
- Route added to `App.tsx`
- `Checkout.tsx` gets a coupon input field — validates code against DB, applies discount, shows savings in order summary
- Coupon usage is tracked (increments `uses_count` on order placement)

---

## Files to Create / Modify

**New files:**
- `src/pages/admin/Messages.tsx` — contact messages inbox
- `src/pages/admin/Coupons.tsx` — coupon management
- `src/components/MobileBottomNav.tsx` — mobile nav bar

**Modified files:**
- `src/App.tsx` — add routes for /admin/messages and /admin/coupons
- `src/components/admin/AdminSidebar.tsx` — add Messages and Coupons links with badges
- `src/pages/admin/SiteSettings.tsx` — add Delivery tab
- `src/pages/OrderSuccess.tsx` — add Track Order link
- `src/pages/Cart.tsx` — fix button text
- `src/pages/Shop.tsx` — add price range filter
- `src/pages/Checkout.tsx` — add coupon field, read delivery fee from settings
- `src/components/ProductCard.tsx` — add low stock badge
- `src/components/Layout.tsx` — add MobileBottomNav

**Database migration (schema only):**
- Create `coupon_codes` table with RLS (admins manage, anyone can read active codes to validate at checkout)

---

## Technical Notes

- Coupon validation at checkout: reads from `coupon_codes` where `code = input AND is_active = true AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR uses_count < max_uses) AND (min_order IS NULL OR min_order <= subtotal)`
- `uses_count` increment happens via `supabase.rpc` or a simple update mutation after order is placed
- Delivery fee: stored in `site_settings.delivery_settings`, fetched by `useSiteSettings("delivery_settings")` in both Cart and Checkout
- Contact messages inbox: uses the existing `is_read` boolean column, updates it via admin-only RLS policy that already exists
- Mobile bottom nav: uses `useCart` and `useWishlist` for badge counts, `useLocation` for active state — hidden above `md` breakpoint
