# 🚀 CMS Upgrade Recommendations
> Practical features that will genuinely help your merchants — not SaaS feature bloat.
> Organized by: **Must-Have** (retention), **Should-Have** (differentiation), **Nice-to-Have** (polish).

---

## 🔴 Must-Have — These directly affect whether merchants stay or leave

---

### 1. WhatsApp Order Notifications

**What:** When a customer places an order → merchant gets a WhatsApp message with order summary (items, total, customer name, phone, address).

**Why it matters:** This is the #1 feature every Bangladesh F-commerce merchant asks for. They run their business from their phone. They don't sit in front of a dashboard refreshing the orders page. If they don't know an order came in, they lose the sale.

**How:**
- Use the WhatsApp Business API (or a simpler route: the `wa.me` click-to-chat URL scheme for the free version, or a service like Twilio/360dialog for the API version)
- On order creation → trigger a Supabase Edge Function that sends a templated WhatsApp notification to the store owner's configured number
- Template: `🛒 New Order #TBD-20260709-XYZ\n👤 Rahim, 01712345678\n📦 Panjabi × 1, Kurti × 2\n💰 ৳2,480\n📍 Dhanmondi, Dhaka\n\nView: https://your-store.com/admin/orders`

**Infrastructure you already have:**
- `whatsapp_support` setting with merchant phone number ✅
- `send-email` edge function pattern to follow ✅
- Order creation hook in `useCreateOrder` ✅

**Effort:** 1-2 days. High impact, low complexity.

---

### 2. Bulk Product Upload via Spreadsheet

**What:** Merchant uploads a CSV/Excel file → products are created in bulk.

**Why it matters:** A clothing merchant typically has 50-200 products. Adding them one by one through the dialog form is brutal. This is the #1 reason merchants abandon setup. Every competitor (Shopify, WooCommerce, Shoplazza) has this.

**How:**
- Add a "Bulk Import" button next to "Add Product" in the Products admin
- Accept `.csv` or `.xlsx` file
- Parse client-side with a library like `papaparse` (CSV) or `xlsx` (Excel)
- Show a preview table with validation (missing name? bad price? no image URL?)
- On confirm → batch insert via Supabase
- Provide a downloadable template file so merchants know the format

**Template columns:**
```
name, price, original_price, category, type, sizes, colors, stock, image_url, description, featured
```

**Effort:** 2-3 days. Massive onboarding improvement.

---

### 3. Order Status SMS/Notification to Customer

**What:** When merchant updates order status (confirmed → shipped → delivered) → customer gets an SMS or WhatsApp message.

**Why it matters:** In Bangladesh F-commerce, the biggest reason for order cancellation is uncertainty. Customer places order → hears nothing for 2 days → cancels and buys from someone else. A simple "Your order has been shipped" SMS reduces cancellation by 30-40%.

**How:**
- On status change in `useUpdateOrderStatus` → call a Supabase Edge Function
- Use a Bangladesh SMS gateway (BulkSMSBD, SSL Wireless, or Twilio) or WhatsApp Business API
- Templates per status:
  - Confirmed: `✅ Order #XYZ confirmed! We're preparing your items.`
  - Shipped: `🚚 Order #XYZ is on its way! Track: [link]`
  - Delivered: `📦 Order #XYZ delivered. Thank you for shopping with us!`

**Effort:** 2-3 days. Directly reduces cancellation rate.

---

### 4. Product Variant System (Size × Color = SKU)

**What:** Currently sizes and colors are just comma-separated text fields. Upgrade to a proper variant system where each Size × Color combination has its own stock count, price override, and image.

**Why it matters:** Right now, a merchant selling a T-shirt in 3 sizes and 4 colors has `stock: 50` — but they can't track that they ran out of Black XL while still having White M. Customers order unavailable combinations and the merchant has to manually cancel.

**How:**
- New table: `product_variants` (product_id, size, color, sku, stock, price_override, image_url)
- When a product has variants → stock is tracked per-variant, not per-product
- Cart stores the variant_id, not just product_id + size
- Admin form shows a variant grid: sizes as rows, colors as columns, stock in each cell

**Effort:** 1-2 weeks. Significant but eliminates a whole class of customer service issues.

---

### 5. Automatic Inventory Deduction on Order

**What:** When an order is placed → product stock is decremented. When an order is cancelled → stock is restored.

**Why it matters:** Right now, stock is display-only. A product with `stock: 5` will accept 100 orders without decrementing. The merchant has to manually update stock after every sale. This leads to overselling and unhappy customers.

**How:**
- In `useCreateOrder` → after inserting the order, run stock decrements for each item:
  ```sql
  UPDATE products SET stock = stock - $quantity WHERE id = $product_id AND stock >= $quantity
  ```
- If stock goes to 0 → set `is_available = false`
- On order cancellation → restore stock
- Add a Supabase database trigger or do it in the edge function for atomicity

**Effort:** 1 day. Should have been there from day one.

---

### 6. Store Preview Before Publish

**What:** A "Preview as Customer" button that opens the storefront in a new tab with a special preview token, even when `is_published = false`.

**Why it matters:** Merchants want to see exactly what their store looks like before going live. The onboarding wizard has a mini preview, but it's a small phone-frame mockup. They need to see the full, real storefront.

**How:**
- Generate a short-lived preview token (UUID stored in session or a `store_preview_tokens` table)
- `/stores/[slug]?preview=TOKEN` → bypasses the `is_published` check for that request
- Preview token expires in 24 hours
- Add a "Preview Store" button in the admin header and onboarding wizard

**Effort:** 1 day. Small but removes a big source of merchant anxiety.

---

## 🟠 Should-Have — These differentiate you from competitors

---

### 7. Delivery Partner Integration (Pathao / Steadfast / RedX)

**What:** Auto-create delivery bookings when merchant marks order as "shipped".

**Why it matters:** 80%+ of Bangladesh F-commerce merchants use Pathao, Steadfast, or RedX for delivery. Right now they have to copy customer details from your dashboard, open the courier's website, paste everything manually, get a tracking number, and come back to paste it. This happens for every single order.

**How:**
- Integrate with Pathao Courier API or Steadfast API (both have REST APIs)
- When order status → "shipped" → show a "Book Delivery" button
- Auto-fill: customer name, phone, address, COD amount
- Receive tracking number → store on the order → show to customer
- Start with ONE courier (Steadfast is simplest API), add others later

**Effort:** 1 week. Massive time savings for merchants.

---

### 8. Facebook Page Auto-Import

**What:** Merchant connects their Facebook Page → auto-generate store name, logo, description, and product catalog from their FB page and catalog data.

**Why it matters:** Your target users are Facebook Page sellers. They already have products listed on Facebook with photos, prices, and descriptions. Asking them to re-enter all of this is the biggest friction point. "Import from Facebook" makes onboarding feel like magic.

**How:**
- Use Facebook Graph API to read Page info + catalog products
- On signup → "Import from Facebook Page" option
- Pull: page name → store name, page profile pic → logo, page about → description
- Pull products from Facebook Catalog (if they have one) or parse page posts
- Pre-fill onboarding wizard with this data

**Effort:** 1-2 weeks. Killer differentiator for Bangladesh market.

---

### 9. Simple Analytics Dashboard for Merchants

**What:** Beyond the current stats (revenue, orders, stock), add:
- **Visitor count** (unique visits to storefront)
- **Conversion rate** (visitors → orders)
- **Top products** (which products get the most views/orders)
- **Revenue trend** (weekly/monthly comparison)

**Why it matters:** Merchants need to understand what's working. "You had 342 visitors this week, 12 orders, 3.5% conversion rate" is actionable. "Your total revenue is ৳24,000" is not.

**How:**
- Track page views via a lightweight analytics event (insert into `store_analytics_events` on each storefront page load)
- Aggregate with a daily Supabase cron job
- Display in a new "Analytics" admin tab with simple charts

**Effort:** 1 week. Makes the dashboard feel professional.

---

### 10. Customer Accounts & Order History

**What:** Customers can create an account on a merchant's store → see their past orders → reorder.

**Why it matters:** Repeat customers are the lifeblood of F-commerce. If a customer can log in, see their past orders, and reorder with one tap, the merchant gets more sales with zero additional marketing effort.

**Infrastructure you already have:**
- `useAuth` with customer-facing auth ✅
- `useMyOrders` hook ✅
- `Account.tsx` view (old layout) ✅

**What's needed:**
- A customer auth flow on the CMS storefront (not the old ThreadBD layout)
- `/stores/[slug]/account` route with order history
- "Reorder" button that adds the same items to cart

**Effort:** 3-4 days. High retention impact.

---

### 11. Coupon Sharing & Auto-Apply via URL

**What:** Merchant creates a coupon → gets a shareable link → customer clicks link → coupon auto-applied at checkout.

**Why it matters:** Merchants share deals on Facebook, WhatsApp groups, Instagram stories. A link like `store.com?coupon=EID25` is much more effective than asking customers to remember and type a code.

**Infrastructure you already have:**
- Full coupon system with `Coupons.tsx` admin ✅
- `coupon_codes` table ✅

**What's needed:**
- Read `?coupon=` from URL params on storefront load
- Store in session/context
- Auto-apply at checkout
- Show a banner: "Coupon EID25 applied! 25% off"

**Effort:** 1 day. Great marketing enabler.

---

### 12. Multi-Language Support (Bangla)

**What:** Admin dashboard and storefront available in Bangla.

**Why it matters:** Your target users are non-technical Bangladeshi merchants. Many of them are more comfortable reading "পণ্য যোগ করুন" than "Add Product". Even basic Bangla labels on the most important actions (add product, update order, publish store) would make a huge difference.

**How:**
- Use `next-intl` or a simple i18n wrapper
- Start with admin dashboard only (storefront content is already merchant-written)
- Translate the 30-40 most important labels (buttons, headings, toasts)
- Add a language toggle in admin settings

**Effort:** 2-3 days for basic implementation. Progressive — can add more translations over time.

---

### 13. Image Optimization & Auto-Compression

**What:** Automatically optimize product images uploaded by merchants — resize, compress, generate WebP variants.

**Why it matters:** Merchants upload huge phone camera photos (3-5MB each). A store with 50 products becomes 200MB of images. On Bangladesh mobile networks (often 3G), this means 10+ second load times. Customers leave.

**Infrastructure you already have:**
- Cloudinary integration ✅ (Cloudinary already does transformations)

**What's needed:**
- Apply Cloudinary transformations on upload: `w_800,q_auto,f_webp`
- Store the optimized URL, not the raw upload URL
- Add a lazy-loading wrapper for storefront product images
- Add `loading="lazy"` and `srcset` for responsive images

**Effort:** 1 day. Directly improves storefront performance.

---

### 14. Store Domain Verification & SSL

**What:** When a merchant sets a custom domain in settings → verify DNS, provision SSL, and activate.

**Why it matters:** A store at `mystore.commerce-engine.com` looks amateur. `mystore.com` looks professional. Custom domains are table stakes for any e-commerce platform.

**Infrastructure you already have:**
- `custom_domain` field on `stores` table ✅
- Custom domain tab in Site Settings ✅
- DNS instruction UI ✅
- `store-resolver.ts` already handles custom domain resolution ✅

**What's needed:**
- DNS verification check (CNAME or A record → your server)
- SSL provisioning (automatic via Vercel if deployed there, or Let's Encrypt)
- A "Verify Domain" button that checks DNS and activates

**Effort:** 1-2 days for the verification flow. SSL depends on hosting.

---

## 🟢 Nice-to-Have — Growth-stage polish

---

### 15. AI Product Description Generator

**What:** Merchant enters product name + a photo → AI generates a compelling product description in Bangla and English.

**Why:** Non-technical merchants write terrible product descriptions ("good quality panjabi"). An AI-generated description dramatically improves the product page quality and SEO.

**Effort:** 1 day with OpenAI/Gemini API.

---

### 16. Social Media Image Generator

**What:** Merchant clicks "Create Social Post" on a product → generates a ready-to-share image with product photo, price, and store branding for Facebook/Instagram.

**Why:** Merchants spend hours in Canva making product posts. A one-click generator saves time and keeps branding consistent.

**Effort:** 2-3 days.

---

### 17. Abandoned Cart Recovery

**What:** If a customer adds items to cart but doesn't checkout within X hours → send a reminder (WhatsApp/SMS) with a link back to their cart.

**Why:** 70% of carts are abandoned. Even recovering 5% is significant revenue.

**Infrastructure you already have:**
- Cart with DB sync for logged-in users ✅
- Cart recovery toast on return ✅

**What's needed:**
- A cron job that checks `cart_items` older than X hours without a matching order
- Send a reminder to the customer's phone/email
- Deeplink back to the store with cart pre-loaded

**Effort:** 3-4 days.

---

### 18. Staff Permissions (Granular)

**What:** Store owner can add team members with specific permissions: "Can manage products but not see revenue", "Can update order status but not delete products".

**Infrastructure you already have:**
- `store_memberships` with roles: owner, admin, editor, viewer ✅
- `canManageStore()` auth helper ✅

**What's needed:**
- Define specific permissions per role (the roles exist but aren't enforced at the UI level)
- Hide/show admin sections based on role
- Fix the RLS gap (editors can't read products via RLS)

**Effort:** 2-3 days.

---

### 19. Scheduled Campaigns

**What:** Merchant schedules a promo: "25% off all products, July 15-20" → prices auto-adjust during that window, announcement bar auto-shows, and revert when campaign ends.

**Why:** Eid, Pohela Boishakh, and other Bangladesh festivals drive massive F-commerce sales. Merchants want to set up campaigns in advance.

**Effort:** 1 week.

---

### 20. Store Performance Report (Weekly Email)

**What:** Every Monday → store owner receives an email: "Last week: 45 visitors, 8 orders, ৳12,400 revenue. Top product: Classic Panjabi. Store health: 85%."

**Why:** Keeps merchants engaged even when they're not logging in. Reminds them the platform exists and their store is alive.

**Infrastructure you already have:**
- `send-email` edge function ✅
- Dashboard stats logic ✅

**What's needed:**
- A weekly Supabase cron job
- Email template with stats
- Unsubscribe option

**Effort:** 2 days.

---

## Priority Map

```
IMPACT
  ▲
  │  ★ WhatsApp order notifs     ★ Bulk product upload
  │  ★ Auto stock deduction      ★ Order status SMS
  │
  │  ◆ Pathao integration        ◆ FB page import
  │  ◆ Customer accounts         ◆ Store analytics
  │  ◆ Image optimization
  │
  │  ○ AI descriptions           ○ Abandoned cart
  │  ○ Social image gen          ○ Weekly email report
  │  ○ Staff permissions         ○ Scheduled campaigns
  │
  └──────────────────────────────────────────────► EFFORT
       1 day        3 days        1 week       2 weeks
```

**★ = Must-Have** | **◆ = Should-Have** | **○ = Nice-to-Have**

---

## My Recommendation: Build Order

1. **Auto stock deduction** (1 day, should exist already)
2. **WhatsApp order notifications** (1-2 days, highest merchant demand)
3. **Post-signup redirect fix** (30 min, already covered in previous audit)
4. **Bulk product upload** (2-3 days, biggest onboarding improvement)
5. **Image optimization via Cloudinary transforms** (1 day, instant performance win)
6. **Order status SMS** (2-3 days, reduces cancellations)
7. **Coupon auto-apply via URL** (1 day, easy marketing win)
8. **Store preview before publish** (1 day, reduces merchant anxiety)

After those 8 items (~2 weeks total), your CMS is genuinely competitive with any Bangladesh F-commerce platform.
