# Code-Level Scalability Audit: COMMERCE Engine

Following your request for a more detailed context, I performed a deep dive into the actual source code of `COMMERCE Engine`, specifically analyzing your database access patterns (`src/lib/cms/store-resolver.ts`), your API routes (`src/app/api/orders/create/route.ts`), and your database migrations (`supabase/migrations/`). 

Here are the actual code-level bottlenecks that will hurt your scalability and reliability, along with precise instructions on how to fix them before launch.

---

## 🛑 Issue 1: Over-fetching in the Core Storefront Resolver

**The Context:**
Every time a user visits a storefront (or when the Next.js cache revalidates every 60 seconds), `getStoreById` in `src/lib/cms/store-resolver.ts` runs this code:

```typescript
// src/lib/cms/store-resolver.ts (Line 432-441)
const [ ..., { data: pages }, { data: blocks }, ... ] = await Promise.all([
    ...
    supabase.from("store_pages").select("id, slug, title, seo_title, seo_description, is_homepage").eq("store_id", storeId),
    supabase.from("store_page_blocks").select("id, page_id, block_type, props, sort_order, is_visible").eq("store_id", storeId),
    ...
]);
```

**The Scalability Problem:**
You are fetching **every single page** and **every single block** for a store in one go. If a merchant scales their store to have 50 blog posts, 20 legal pages, and hundreds of custom blocks, this query will load all of that JSON into memory just to render the homepage.

**The Solution:**
Instead of fetching all blocks for the store, fetch only the blocks for the specific page being requested. If it's the homepage, you can filter using a join or a two-step query.
```typescript
// Better: Fetch pages, find the requested page, THEN fetch blocks only for that page_id.
const { data: page } = await supabase.from("store_pages").select("*").eq("store_id", storeId).eq("is_homepage", true).single();
const { data: blocks } = await supabase.from("store_page_blocks").select("*").eq("page_id", page.id);
```

---

## 🛑 Issue 2: "Floating Promises" in Vercel Serverless Functions

**The Context:**
When a customer creates an order, you have a massive API route: `src/app/api/orders/create/route.ts`. After successfully creating the order, you fire off several background tasks using `void`:

```typescript
// src/app/api/orders/create/route.ts (Line 128 & Line 216)
void triggerWhatsAppOrderNotify(supabaseAdmin, { ... });
void (supabaseAdmin as any).from("store_analytics_events").insert(purchaseEventRows);
void (supabaseAdmin as any).from("store_revenue_events").insert({ ... });
```

**The Scalability & Reliability Problem:**
In standard Node.js, `void myAsyncFunction()` runs in the background. But in Serverless environments (like Vercel AWS Lambda), the moment you return `NextResponse.json({ order })` on Line 265, **the serverless function is instantly frozen or killed**. 
This means your WhatsApp notifications, analytics, and cart recovery logic will randomly fail or drop mid-execution depending on exactly when Vercel decides to kill the function.

**The Solution:**
Next.js provides a native way to handle this without delaying the response to the user. You must use `waitUntil` (or the experimental Next.js `after` function).
```typescript
import { waitUntil } from '@vercel/functions'; // or next/server

waitUntil(triggerWhatsAppOrderNotify(supabaseAdmin, { ... }));
waitUntil((supabaseAdmin as any).from("store_analytics_events").insert(purchaseEventRows));
```
*Note: For true scalability, as mentioned in the previous audit, these should be published to a Message Queue (like Upstash Kafka) rather than executed in the same serverless function.*

---

## 🛑 Issue 3: Asynchronism handled poorly via Postgres Triggers (pg_net)

**The Context:**
In `supabase/migrations/20260704002400_email_triggers.sql`, you are using `pg_net` to call an Edge Function whenever a store subscription updates:
```sql
PERFORM net.http_post(
  url := current_setting('app.settings.edge_function_url', true) || '/send-email', ...
```

**The Scalability Problem:**
This is technically asynchronous, which is better than locking the row, but managing third-party API calls (like sending emails) via a database trigger is an anti-pattern (as discussed in the System Design Primer under "Asynchronism"). If the edge function fails, the database trigger has no built-in retry mechanism (Dead Letter Queue).

**The Solution:**
1. **Short term:** Rely on `pg_net` if it works, but monitor `net._http_response` carefully for failures.
2. **Long term (SaaS Scale):** Remove the trigger. Instead, use Supabase Realtime (or Webhooks) to listen to `UPDATE` events on `store_subscriptions`. Send that event to an Inngest or Trigger.dev background worker, which has built-in retries, failure logging, and exponential backoff.

---

## ✅ What's Surprisingly Good at the Code Level

1. **You avoided `select('*')`:** In `store-resolver.ts`, you explicitly list columns (`select("id, slug, title...")`). This saves significant Postgres CPU and bandwidth. Excellent practice.
2. **Database Indexes are present:** In `04_store_scoped_commerce.sql`, you have created indexes (`CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);`). This proves you are thinking about multi-tenant query speeds.
3. **Optimistic Revenue Math:** In `orders/create/route.ts`, you are calculating `productRevenueWeight` effectively in memory rather than forcing Postgres to do complex aggregations on insert.
