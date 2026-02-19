

# Fix: Product Creation and Order Placement Failures

## Root Cause Analysis

### Issue 1: Orders failing with RLS violation
The order creation code does `.insert(payload).select().single()` -- this means after inserting, it tries to SELECT the newly created row. The INSERT policy (`WITH CHECK: true`) works fine, but the SELECT policies require either:
- `user_id = auth.uid()` (for regular users), OR
- `is_admin(auth.uid())` (for admins)

When a guest user (not logged in) places an order, `user_id` is set to `null`. After the insert succeeds, the `.select()` fails because `null = null` returns FALSE in SQL, so no SELECT policy matches. Even for logged-in users, if there's any auth timing issue, this can fail.

### Issue 2: Missing database triggers
The functions `generate_order_number()`, `check_stock_availability()`, and `update_updated_at_column()` exist but have **no triggers attached**. This means:
- Order numbers are saved as "placeholder" instead of being auto-generated
- Stock availability isn't auto-updated when stock hits zero
- `updated_at` timestamps never refresh

### Issue 3: Products insert may fail
The products INSERT policy targets `authenticated` role and checks `is_admin(auth.uid())`. If the admin role detection has any issues, inserts fail silently.

## Fix Plan

### Step 1: Database Migration -- Create Missing Triggers
Attach the existing trigger functions to their tables:
- `generate_order_number` BEFORE INSERT on `orders`
- `check_stock_availability` BEFORE INSERT OR UPDATE on `products`
- `update_updated_at_column` BEFORE UPDATE on `orders` and `products`

### Step 2: Fix Orders RLS for Guest Checkout
Add a permissive INSERT policy that returns the inserted row. The cleanest approach: change the code to not chain `.select().single()` for the insert, and instead use a separate approach. However, the better fix is:
- Remove the `.select().single()` from the insert call
- Generate the order number client-side (matching the same format) so we don't need the returned data
- OR: Add an RLS policy allowing users to SELECT orders they just inserted (using a broader condition)

The simplest and most robust fix: modify `useCreateOrder` to not require `.select()` by generating the order number client-side in the same format (`TBD-YYYYMMDD-XXXXXX`), and just do `.insert()` without `.select()`.

### Step 3: Seed site_settings for the upgrade plan
Insert the initial `payment_settings`, `faq_entries`, `contact_page`, `categories`, and `seo_settings` rows into `site_settings` via migration.

## Technical Changes

### Database migration (SQL)
- CREATE TRIGGER `generate_order_number` BEFORE INSERT ON orders
- CREATE TRIGGER `check_stock_availability` BEFORE INSERT OR UPDATE ON products  
- CREATE TRIGGER `update_updated_at` BEFORE UPDATE ON orders
- CREATE TRIGGER `update_updated_at_products` BEFORE UPDATE ON products
- INSERT default site_settings rows for payment, FAQ, contact, categories, SEO

### Code changes

**`src/hooks/useOrders.ts`**
- Modify `useCreateOrder` to generate order number client-side
- Remove `.select().single()` from the insert, just do `.insert()`
- Return the generated order number directly without needing DB response

**No other code changes needed** -- once triggers exist and the insert flow is fixed, both orders and products will work correctly.

