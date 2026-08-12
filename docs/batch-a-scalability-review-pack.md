# Batch A Review Pack

Last updated: August 11, 2026

## Scope

This batch is the reviewable release slice for:
- storefront load reduction,
- safe cache invalidation,
- queue-backed deferred processing,
- processor endpoints for notification and cart-recovery delivery,
- supporting production wiring.

## Exact Batch A Files In The Current Worktree

### Core storefront loading and cache control

- `src/lib/cms/store-resolver.ts`
- `src/lib/cms/store-resolver.test.ts`
- `src/lib/cms/request-store.ts`
- `src/lib/storefront-cache-client.ts`
- `src/app/api/cache/storefront/revalidate/route.ts`

### Deferred order and notification processing

- `src/lib/orders/order-background-jobs.ts`
- `src/lib/orders/order-background-queue.ts`
- `src/lib/orders/order-background-queue.test.ts`
- `src/lib/notifications/notification-delivery-queue.ts`
- `src/lib/notifications/notification-delivery-queue.test.ts`
- `src/lib/cart-recovery/recovery-message-processor.ts`
- `src/lib/cart-recovery/client.ts`

### Queue and processor endpoints

- `src/app/api/queues/order-background/route.ts`
- `src/app/api/queues/notification-delivery/route.ts`
- `src/app/api/notifications/process-queue/route.ts`
- `src/app/api/cart-recovery/process-queue/route.ts`

### Request-path integrations

- `src/app/api/orders/create/route.ts`
- `src/app/api/orders/status/route.ts`
- `src/app/api/notifications/test/route.ts`
- `src/app/api/notifications/retry/route.ts`
- `src/app/api/route-side-effects.test.ts`

### Shell-loader storefront routes

- `src/app/blog/page.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/app/stores/[storeSlug]/blog/page.tsx`
- `src/app/stores/[storeSlug]/blog/[slug]/page.tsx`
- `src/app/stores/[storeSlug]/shop/page.tsx`
- `src/app/stores/[storeSlug]/product/[slugId]/page.tsx`
- `src/app/stores/[storeSlug]/checkout/page.tsx`
- `src/app/stores/[storeSlug]/order-success/page.tsx`
- `src/app/stores/[storeSlug]/(customer-pages)/layout.tsx`
- `src/app/storefront-shell-routes.test.ts`

## Neighbor Files To Leave Out Of Batch A Unless Their Diffs Are Directly Required

These files live beside Batch A routes but should not be included unless their actual diffs are part of the loader or cache work:

- `src/app/stores/[storeSlug]/shop/StoreShopPageClient.tsx`
- `src/app/stores/[storeSlug]/product/[slugId]/StoreProductPageClient.tsx`
- `src/app/stores/[storeSlug]/checkout/StoreCheckoutClient.tsx`
- `src/app/stores/[storeSlug]/order-success/StoreOrderSuccessClient.tsx`
- child customer pages under `src/app/stores/[storeSlug]/(customer-pages)/**`

## Required Infra Files

- `.env.example`
- `vercel.json`
- `supabase/migrations/20260811143000_cart_recovery_delivery_processor.sql`
- `supabase/migrations/20260811230000_notification_outbox_delivery.sql`
- `supabase/migrations/20260811231010_notification_processor_runtime_config.sql`

## Verification Baseline For This Batch

Already passing in the current worktree:

- `npm.cmd run lint`
- `npm.cmd run typecheck -- --pretty false`
- targeted test sweep covering:
  - `src/app/api/route-side-effects.test.ts`
  - `src/app/storefront-shell-routes.test.ts`
  - `src/lib/cms/store-resolver.test.ts`
  - `src/lib/orders/order-background-queue.test.ts`
  - `src/lib/notifications/notification-delivery-queue.test.ts`

## Production Readiness Requirements For This Batch

Before deployment, ensure production has:

- `ORDER_BACKGROUND_JOBS_TRANSPORT`
- `NOTIFICATION_JOBS_TRANSPORT`
- `NOTIFICATION_PROCESSOR_SECRET`
- `CART_RECOVERY_PROCESSOR_SECRET`
- database runtime settings for:
  - `app.settings.notification_processor_url`
  - `app.settings.notification_processor_secret`
  - `app.settings.cart_recovery_processor_url`
  - `app.settings.cart_recovery_processor_secret`

## Release Intent

Batch A should be reviewed and released as infrastructure-backed storefront reliability work. It should not be mixed with:
- search rollout,
- CMS editor/template restructuring,
- marketing page changes,
- broad platform control-plane refactors.
