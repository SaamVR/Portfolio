
# Product Reviews System — Full Plan

## Current State

The current `ProductReviews` component displays **fake, seeded, pseudo-random reviews** generated from the product ID. There is no real database table for reviews. The system needs to be replaced/extended with a real, database-backed review system.

---

## What Will Be Built

### Overview of the Flow

```text
Customer places order
        ↓
Order status changes to "delivered"
        ↓
"Leave a Review" prompt appears in Account → Orders tab
(smart banner, not annoying modal)
        ↓
Customer clicks items to rate → submits review
        ↓
Review stored in DB with status = "pending"
        ↓
Admin sees pending reviews badge in sidebar → Reviews page
        ↓
Admin approves, removes, or replies to each review
        ↓
Approved reviews appear on the product page (merged with seeded reviews)
```

---

## Part 1 — Database

### New table: `product_reviews`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK → products |
| `user_id` | uuid | FK → auth user |
| `order_id` | uuid | FK → orders (validates purchase) |
| `author_name` | text | Copied from profile at submit time |
| `rating` | integer | 1–5 |
| `review_text` | text | The review body |
| `size_purchased` | text | Copied from order item |
| `status` | text | `pending` / `approved` / `rejected` |
| `admin_reply` | text | nullable — admin's reply |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### RLS Policies

- **Anyone can read** approved reviews (`status = 'approved'`)
- **Authenticated users can insert** their own reviews (with `user_id = auth.uid()`)
- **Users cannot insert duplicate** reviews for the same product+order (handled via unique constraint on `user_id + product_id + order_id`)
- **Admins can read all** reviews (pending + approved + rejected)
- **Admins can update** any review (to approve, reject, add reply)
- **Users cannot update or delete** their own reviews after submission (review integrity)

---

## Part 2 — Shopper Experience

### A. "Leave a Review" prompt in Account → Orders tab

When an order has `status = "delivered"`, each item in that order will show a **"Write a Review"** button next to it — only if the user hasn't already reviewed that product from that order.

The prompt will be a warm, friendly inline call-to-action:
- A small star icon strip
- "How was [Product Name]?" text
- "Share your experience" subtext
- "Write a Review" button that opens a **sheet/modal**

This is the industry-standard pattern (Amazon, Daraz, Shein all do this) — show the prompt in the order history rather than sending an email, catching the user at the natural moment they check their order status.

### B. Review Submission Form (Sheet/Dialog)

When "Write a Review" is clicked, a sheet slides up from the bottom (mobile-friendly) containing:
- Product name + image (header context)
- **Star picker** (interactive — click to select 1–5 stars)
- **Text area** for the written review (optional but encouraged)
- Friendly placeholder: *"What did you love about it? How was the fit? Would you recommend it?"*
- Character counter
- "Post Review" button
- A note: *"Your review will be visible after a quick check by our team"*

### C. "Already Reviewed" state

Once submitted, the button changes to "✓ Review Submitted" (muted, non-clickable) in the orders tab.

---

## Part 3 — Product Page Reviews Component

`ProductReviews.tsx` will be updated to:
1. Fetch **approved** reviews from the DB for that `product_id`
2. Merge them with the existing **seeded reviews** (seeded ones fill the gap until real reviews accumulate — they will gradually be phased out as real reviews arrive, or kept as a floor)
3. Show an **admin reply** below any review that has one — styled as a branded reply bubble (like Amazon's "Seller Response")
4. Display the real average rating calculated from real + seeded reviews

The "Verified Purchase" badge will now be **genuinely accurate** — real DB reviews always show it as verified (they require a delivered order).

---

## Part 4 — Admin Panel

### New page: `/admin/reviews`

A dedicated Reviews management page with:

**Filter tabs:** All · Pending · Approved · Rejected

**Each review card shows:**
- Product name + thumbnail
- Customer name, star rating, date
- Review text
- Order number (for traceability)
- Status badge (Pending / Approved / Rejected)

**Actions per review:**
- **Approve** — makes the review visible on the product page
- **Reject** — hides it permanently (with a soft label, not deleted)
- **Reply** — opens an inline text field to type an admin reply; saved to `admin_reply` column; shown below the review on the product page

**Pending badge in sidebar** — same as Messages unread count: a real-time badge showing how many reviews are awaiting moderation.

---

## Part 5 — Admin Sidebar

Add a "Reviews" link with a live badge count of pending reviews:
- Icon: `MessageSquare` from lucide-react
- Badge: count of `status = 'pending'` reviews, refreshed every 30s
- Visible to all admins

---

## Technical Changes

### Files to Create

| File | Purpose |
|---|---|
| `src/pages/admin/Reviews.tsx` | Admin review moderation page |
| `supabase/migrations/[timestamp]_reviews.sql` | Creates `product_reviews` table + RLS |

### Files to Modify

| File | Change |
|---|---|
| `src/components/ProductReviews.tsx` | Fetch real DB reviews, merge with seeded, show admin replies |
| `src/pages/Account.tsx` | Add "Leave a Review" prompts in delivered orders + submission sheet |
| `src/components/admin/AdminSidebar.tsx` | Add Reviews link + pending badge |
| `src/App.tsx` | Add `/admin/reviews` route |

### Key Implementation Details

- The review form uses a controlled `useState` star picker (5 clickable stars) with hover states
- Submission uses a `useMutation` that inserts into `product_reviews` with `status = 'pending'`
- The check "has this user already reviewed this product from this order?" is a `useQuery` that checks `product_reviews` where `user_id = auth.uid() AND order_id = X AND product_id = Y`
- Batch check for all items in all delivered orders is done with a single query: `select product_id, order_id from product_reviews where user_id = auth.uid()` → stored in a Set for O(1) lookup
- Admin reply: clicking "Reply" shows an inline `<textarea>` + save button; saves via `.update({ admin_reply: text })` 
- On the product page, real reviews are shown **first** (most recent), seeded reviews shown after as "earlier reviews"
