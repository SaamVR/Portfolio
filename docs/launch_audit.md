# 🔍 SaaS Launch Audit — Commerce Engine
> Deep technical audit focused on bugs, security gaps, broken flows, and rough edges that must be fixed before accepting real merchants.
> **Audit date: 2026-07-09**

---

## Executive Summary

The application is **architecturally sound** — the multi-tenant schema, RLS policies, auth flow, billing pipeline, and CMS builder are all production-quality. However, there are **14 specific issues** that need fixing before launch, organized by severity.

| Severity | Count | Impact |
|---|---|---|
| 🔴 Critical | 3 | Breaks merchant or customer experience |
| 🟠 High | 5 | Security risk, data integrity, or silent failure |
| 🟡 Medium | 6 | Polish, branding, resilience |

---

## 🔴 CRITICAL — Must fix before first merchant

---

### C1. Checkout → Order Success navigation breaks on CMS storefront

**File:** [Checkout.tsx:293](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Checkout.tsx#L293)

```typescript
navigate("/order-success", { state: { orderNumber: order.order_number } });
```

**Problem:** When a customer places an order on a CMS storefront (`/stores/my-store/checkout`), the `navigate("/order-success")` sends them to the **legacy** `/order-success` page instead of `/stores/my-store/order-success`. The legacy page renders with ThreadBD branding, not the merchant's store branding.

Additionally, the `state` parameter doesn't survive the Next.js router shim (Next.js doesn't support `location.state`). The order number is lost.

**Fix:** Use `storefrontPath` and query params:
```typescript
const orderUrl = storefrontPath(
  `/order-success?order=${order.order_number}`, 
  currentStore?.slug
);
navigate(orderUrl);
```

> [!IMPORTANT]
> The `StoreOrderSuccessClient` route at `/stores/[storeSlug]/order-success` already exists and works correctly. The only bug is the redirect from Checkout.

---

### C2. OrderSuccess page has hardcoded ThreadBD branding

**File:** [OrderSuccess.tsx:34](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/OrderSuccess.tsx#L34)

```
Thank you for shopping with ThreadBD.
```

**Problem:** When a customer orders from "Fashion Hub" or "Deshi Wear", they see "Thank you for shopping with **ThreadBD**". This destroys the white-label CMS value proposition.

Also, the "Continue Shopping" link points to `/shop` (legacy), not `storefrontPath("/shop", storeSlug)`.

**Fix:**
- Replace "ThreadBD" with dynamic store name from context
- Use `storefrontPath()` for all navigation links
- Same fix needed in all 3 links: Continue Shopping, Track Order, View Orders

---

### C3. 22+ hardcoded `DEFAULT_STORE_ID` fallbacks — cross-tenant data leakage risk

**Files affected (not exhaustive):**

| File | Line | Fallback Pattern |
|---|---|---|
| [Checkout.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Checkout.tsx#L69) | 69 | `currentStore?.id ?? "00000000-..."` |
| [Contact.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Contact.tsx#L36) | 36 | `currentStore?.id ?? "00000000-..."` |
| [Account.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Account.tsx#L129) | 129, 401 | Same |
| [CartDrawer.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/CartDrawer.tsx#L15) | 15, 20 | Same |
| [ProductReviews.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/ProductReviews.tsx#L108) | 108 | Same |
| [ProductQA.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/ProductQA.tsx#L18) | 18 | Same |
| [GuestCheckoutModal.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/GuestCheckoutModal.tsx#L30) | 30 | Same |
| [ExitIntentPopup.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/ExitIntentPopup.tsx#L12) | 12 | Same |
| [CategoryShowcase.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/CategoryShowcase.tsx#L79) | 79 | Same |
| [CloudinaryUpload.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/admin/CloudinaryUpload.tsx#L59) | 59, 109 | Same |
| [MediaLibraryBrowser.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/admin/MediaLibraryBrowser.tsx#L89) | 89 | Same |
| [MediaLibraryPicker.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/components/admin/MediaLibraryPicker.tsx#L51) | 51 | Same |
| [CartContext.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/context/CartContext.tsx#L9) | 9 | Same |
| [media-library.ts](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/lib/media-library.ts#L41) | 41, 59 | Same |
| [control-plane.ts](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/lib/platform/control-plane.ts#L79) | 79 | Same |

**Problem:** If `currentStore` is ever `null` (which happens during SSR, during auth loading, or on legacy routes), these components silently query data from the ThreadBD demo store. This means:
- A merchant editing their store might see demo store media in their media library
- A customer on a CMS storefront that briefly loses context sees ThreadBD products in their cart
- Reviews, Q&A, and checkout can bleed across tenants

**Fix:** Replace all `?? "00000000-..."` fallbacks with an explicit guard:
```typescript
const storeId = currentStore?.id;
if (!storeId) return <StoreNotFoundState />;
```

Or, for hooks that run before render, throw/return empty data when `storeId` is undefined.

> [!CAUTION]
> This is the single most important multi-tenancy fix. Data leaking between tenants = instant trust destruction.

---

## 🟠 HIGH — Security & data integrity

---

### H1. No error boundary or `error.tsx` anywhere in the app

**Problem:** The entire Next.js app has **zero** `error.tsx` files. If any server component throws (e.g., Supabase is down, a migration breaks a query), the user sees a raw Next.js error page or a white screen.

**Fix:** Create at minimum:
- `src/app/error.tsx` — global error boundary
- `src/app/not-found.tsx` — custom 404 page
- `src/app/stores/[storeSlug]/error.tsx` — storefront-specific error
- `src/app/admin/error.tsx` — admin-specific error

### H2. Hardcoded ThreadBD brand name throughout CMS storefront views

**Files with hardcoded "ThreadBD" in customer-facing views:**

| File | Occurrences |
|---|---|
| [OrderSuccess.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/OrderSuccess.tsx) | 2 |
| [Checkout.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Checkout.tsx) | 1 |
| [Cart.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Cart.tsx) | 2 |
| [Shop.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Shop.tsx) | 2 |
| [About.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/About.tsx) | 3 |
| [FAQ.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/FAQ.tsx) | 3 |
| [Returns.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Returns.tsx) | 2 |
| [Wishlist.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Wishlist.tsx) | 1 |
| [TrackOrder.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/TrackOrder.tsx) | 2 |
| [Contact.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Contact.tsx) | 1 |
| [Account.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Account.tsx) | 1 |
| [ProductDetail.tsx](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/ProductDetail.tsx) | 3 |
| [Orders.tsx (admin invoice)](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/admin/Orders.tsx) | 1 |

**Problem:** Every merchant's store renders "ThreadBD" in SEO descriptions, page titles, thank-you messages, and even print invoices. This is a white-label CMS — the platform brand should never appear in a merchant's customer-facing experience.

**Fix:** Replace every hardcoded "ThreadBD" with `storeName` from `useOptionalStore()` or props. The invoice template in Orders.tsx should use the store's brand name.

### H3. `GRANT ALL` migration is overly permissive

**File:** [20260709000002_grant_public_schema_privileges.sql](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/supabase/migrations/20260709000002_grant_public_schema_privileges.sql)

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
```

**Problem:** This grants `DELETE`, `INSERT`, `UPDATE` on **all** tables to `anon` (unauthenticated users). While RLS is the real gatekeeper, this is a defense-in-depth violation. If any table accidentally has RLS disabled, anonymous users have full write access.

**Fix:** Grant `SELECT` to `anon`, and `SELECT, INSERT, UPDATE, DELETE` to `authenticated` and `service_role`. Be explicit:
```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
```

### H4. `supabase as any` type casts bypass safety

**Files:**
- [useAuth.tsx:36](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/hooks/useAuth.tsx#L36) — `(supabase as any).from("store_memberships")`
- [Billing.tsx:45,61,76](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/admin/Billing.tsx#L45) — `(supabase as any).from(...)`
- Multiple other files

**Problem:** The `as any` casts exist because the auto-generated Supabase types don't include all tables. This is a maintenance debt — if a table is renamed or a column is removed, TypeScript won't catch the error. Queries will fail silently at runtime.

**Fix:** Regenerate types with `npx supabase gen types typescript`. All tables added by migrations should appear in the generated types. Then remove `as any`.

### H5. Billing subscription API route has no auth guard

**File:** [billing/subscription/route.ts](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/app/api/billing/subscription/)

**Problem (to verify):** The checkout route correctly validates `canManageStore(...)`, but check whether the `PATCH /api/billing/subscription` route (for switching to free plans) also validates ownership. If not, any authenticated user could switch another store's plan.

---

## 🟡 MEDIUM — Polish & resilience

---

### M1. `Outlet` shim renders error box in production

**File:** [react-router-dom-shim.tsx:121-126](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/lib/react-router-dom-shim.tsx#L121)

```tsx
export const Outlet = () => {
  if (process.env.NODE_ENV === "development") {
    console.error("Outlet was rendered...");
  }
  return <div className="text-red-500 font-bold p-4 border border-red-500">...</div>;
};
```

**Problem:** In production, this still renders a red error box. The `if` only controls the `console.error`, not the JSX return. If any legacy component imports `Outlet`, users see a broken red box.

**Fix:** Return `null` in production, or better, find and remove all `Outlet` imports.

### M2. Checkout uses `location.state` which doesn't work in Next.js

**File:** [Checkout.tsx:293](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/Checkout.tsx#L293)

The `useNavigate` shim maps to `router.push(to)`, but the `state` option from React Router is not forwarded to the Next.js router. The order number is lost in transition.

**Fix:** Pass the order number as a query parameter: `?order=TBD-20260709-XXXX`

### M3. `ProductDetail.tsx` has hardcoded `threadbd.com` canonical URLs

**File:** [ProductDetail.tsx:181,350](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/views/ProductDetail.tsx#L181)

```tsx
canonical={`https://threadbd.com${productUrl(product.id, product.name)}`}
```

**Problem:** Every merchant's product page tells Google its canonical URL is on `threadbd.com`. This damages SEO for all CMS storefronts.

**Fix:** Use dynamic domain: `https://${storeSlug}.${CMS_ROOT_DOMAIN}` or just omit canonical for CMS stores.

### M4. No rate limiting on storefront product/page queries

**Problem:** The Supabase client-side queries for products, categories, and pages have no rate limiting. A malicious actor could hammer a store's public queries and exhaust the database pool.

**Fix:** Consider:
- Adding Vercel's built-in rate limiting on `/stores/*` routes
- Or caching product/page data with ISR (Next.js `revalidate`)

### M5. Cart Provider in `providers.tsx` has no `storeId` prop

**File:** [providers.tsx:37](file:///d:/AiProjects/ThreadBD/COMMERCE%20Engine/src/app/providers.tsx#L37)

```tsx
<CartProvider>
```

**Problem:** The global `CartProvider` wraps the entire app (including admin views) without a `storeId`. When `CartContext` initializes without a store, it falls back to the `DEFAULT_STORE_ID` constant. This means:
- Admin dashboard might show cart items from the demo store
- Cart count badge in the admin header is misleading

**Fix:** Either:
1. Pass `activeStoreId` from auth context to `CartProvider`
2. Or make `CartProvider` no-op when outside a storefront context

### M6. Migration file naming inconsistency

**Files:** The migrations directory contains two naming conventions:
- Sequential: `01_platform_core.sql`, `02_store_tenancy.sql`, etc.
- Timestamped: `20260702000003_init.sql`, `20260704001500_fix_store_member_rls.sql`, etc.

**Problem:** Supabase applies migrations in alphabetical order. `01_` comes before `20260702...`, so the order is correct, but this is confusing for maintenance and debugging.

**Fix:** Either rename the sequential files to timestamped format, or ensure the README clearly documents the expected order.

---

## ✅ What's Already Good (No Action Needed)

These areas passed audit:

| Area | Status | Notes |
|---|---|---|
| **Auth flow** | ✅ Solid | Race condition fixed. Loading state prevents UI flash. Token-based, no plaintext secrets. |
| **RLS policies** | ✅ Comprehensive | All commerce tables use `can_manage_store()`. Public reads require `is_published`. Customer writes scoped by `auth.uid()`. |
| **Merchant signup** | ✅ Correct | Edge function creates store + membership + subscription atomically. 24-hour rate limit. Slug uniqueness check. Redirects to `/admin/onboarding?storeId=`. |
| **Billing pipeline** | ✅ Functional | Full bKash tokenized checkout → callback → invoice → subscription activation. Amount verification, ID mismatch detection, failed payment cleanup. |
| **Webhook security** | ✅ Good | Shared secret validation via `x-commerce-webhook-secret` header. |
| **Order creation** | ✅ Robust | Server-side API route with rate limiting, idempotency key, Zod-like validation, `create_store_order_with_stock` RPC for atomic stock deduction. |
| **Store resolver** | ✅ Well-designed | Hostname → subdomain slug → custom domain fallback chain. Supports multi-domain base config. |
| **CMS builder** | ✅ Complete | Block-based, revision history, live preview, page templates, SEO fields. |
| **Storefront routing** | ✅ Complete | All routes exist: `/stores/[slug]`, `/stores/[slug]/shop`, `/stores/[slug]/product/[id]`, `/stores/[slug]/checkout`, `/stores/[slug]/order-success`. |
| **API auth helpers** | ✅ Clean | `getAuthenticatedUser` uses token verification. `canManageStore` checks ownership + membership + platform role. |

---

## 🎯 Prioritized Fix Sprint

### Week 1: Launch Blockers (3 days)
- [ ] **C1**: Fix checkout → order-success redirect to use `storefrontPath()`
- [ ] **C2**: Replace hardcoded "ThreadBD" in OrderSuccess with dynamic store name
- [ ] **C3**: Replace all 22+ `DEFAULT_STORE_ID` fallbacks with null guards
- [ ] **H2**: Replace all hardcoded "ThreadBD" across all customer-facing views (28+ occurrences)
- [ ] **M1**: Fix Outlet shim to return `null` in production
- [ ] **M2**: Pass order number as query param instead of `location.state`
- [ ] **M3**: Fix hardcoded `threadbd.com` canonical URLs

### Week 1: Security Hardening (1 day)
- [ ] **H1**: Create `error.tsx` and `not-found.tsx` for global, admin, and storefront routes
- [ ] **H3**: Restrict `GRANT` to `SELECT` only for `anon` role
- [ ] **H5**: Verify `PATCH /api/billing/subscription` has auth guard

### Week 2: Code Quality (2 days)
- [ ] **H4**: Regenerate Supabase types and remove `as any` casts
- [ ] **M5**: Fix CartProvider storeId scoping in global providers
- [ ] **M6**: Standardize migration file naming

### Week 2: Optional but Recommended
- [ ] **M4**: Add ISR caching or rate limiting for public storefront queries
- [ ] Add monitoring/alerting for edge function errors
- [ ] Set up a health check endpoint

---

## Verification After Fixes

Run these smoke tests after applying fixes:

```
1. Sign up as new merchant → verify redirect to /admin/onboarding
2. Complete onboarding → publish store
3. Visit store → add product to cart → checkout → order success
   ✓ No "ThreadBD" text visible anywhere
   ✓ Order number appears on success page
   ✓ All links stay within /stores/[slug]/ prefix
4. Log in as different merchant → verify no data from other store
5. Open browser console → verify no errors or warnings
6. Visit /stores/nonexistent → verify custom 404 page
7. Check admin billing → upgrade plan → verify bKash flow
```
