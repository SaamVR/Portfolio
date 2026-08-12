# Scalability Batch Roadmap

Last updated: August 11, 2026

## Goal

Keep COMMERCE Engine scalable by shipping changes in small batches that:
- reduce origin and database pressure,
- avoid large refactors blocking launch work,
- preserve safe storefront freshness for merchants,
- keep each batch independently testable and releasable.

## Completed Batches

### Batch 1: Serverless reliability hardening

- Moved floating order side effects away from raw fire-and-forget behavior.
- Marked private and order-sensitive API responses as `no-store`.
- Reduced risk of dropped analytics, revenue, and notification writes in serverless execution.

### Batch 2: Safe storefront caching baseline

- Added safe Cloudflare guidance and configuration boundaries.
- Added public storefront cache headers for catalog endpoints.
- Kept HTML caching conservative to avoid leaking dynamic commerce state.

### Batch 3: Storefront resolver load reduction

- Stopped loading every page block for every storefront request.
- Resolver now loads the requested page and homepage block sets instead of full-store page-block payloads.

### Batch 4: Cache invalidation foundation

- Added authenticated storefront refresh endpoint.
- Wired refresh calls into merchant save flows.
- Added store, content, product, and page-level cache tags.

### Batch 5: Scoped invalidation rollout

- Product writes now use product-scoped invalidation.
- Content/theme/page writes now use content-scoped invalidation.
- Page builder and live editor now send page slugs for page-level invalidation.

### Batch 6: Search and taxonomy precision

- Added explicit storefront taxonomy and search invalidation support.
- Search and catalog surfaces can now refresh without forcing full content churn.
- Category/type save flows trigger more precise taxonomy-aware invalidation.

### Batch 7: Write-path consolidation

- Consolidated most storefront refresh callers onto shared cache refresh helpers.
- Reduced duplicated invalidation logic across admin and editor save flows.
- Kept invalidation intent closer to reusable helper functions.

### Batch 8: Background job consolidation

- Centralized order-created and order-cancelled background side effects.
- Reduced duplicated request-path side-effect logic across order handlers.
- Preserved asynchronous behavior while making future queue adoption easier.

### Batch 9: Storefront data segmentation

- Added shell-style store loaders that preserve theme/settings while skipping CMS page and block fetches.
- Public shop, product, checkout, order-success, customer account shell, and blog routes now avoid full CMS payload loading.
- Resolver cache entries for these flows stay smaller as merchant page libraries grow.

### Batch 10: Queue-backed order and notification dispatch

- Added queue-backed dispatch for order background side effects with inline fallback.
- Added queue-backed notification delivery with inline fallback for test and retry flows.
- Kept request handlers fast while preserving a safe no-regression path when queue publishing is unavailable.

### Batch 11: Delivery processors for deferred retries

- Added notification outbox processor runtime support with authenticated processing endpoints.
- Added cart recovery delivery processor support for due-message claiming and send-state transitions.
- Preserved current email recovery delivery while explicitly skipping automated WhatsApp recovery sends until that transport is implemented.

### Batch 12: Regression proof for scale-sensitive paths

- Added focused coverage for shell loaders, queue dispatchers, notification processors, and cart recovery processors.
- Fixed adjacent auth and side-effect test contracts so production-sensitive flows stay covered.
- Verified the touched scale work with passing focused typecheck and targeted test sweeps.

## Next Planned Batches

### Batch 13: Processor deployment wiring

Goal:
- make deferred processing fully operational in production without manual intervention.

Recommended work:
- set production values for `ORDER_BACKGROUND_JOBS_TRANSPORT` and `NOTIFICATION_JOBS_TRANSPORT`.
- configure `NOTIFICATION_PROCESSOR_SECRET` and `CART_RECOVERY_PROCESSOR_SECRET`.
- set database runtime settings for `app.settings.notification_processor_url`, `app.settings.notification_processor_secret`, `app.settings.cart_recovery_processor_url`, and `app.settings.cart_recovery_processor_secret`.
- add an operator runbook for replaying or diagnosing stuck deferred work.

### Batch 14: Remaining request-path fan-out removal

Goal:
- keep checkout and mutation requests focused on durable writes plus dispatch only.

Recommended work:
- move remaining inline analytics, revenue-event, and recovery-update fan-out behind the same deferred-processing model.
- isolate dead-letter and replay visibility by job type.
- preserve an inline fallback only where business continuity truly requires it.

### Batch 15: Observability and performance evidence

Goal:
- keep scale work from regressing silently and measure payoff.

Recommended work:
- add lightweight timing and cache-hit diagnostics around resolver and catalog paths.
- add smoke checks for page save, product save, category save, and restore flows.
- capture expected invalidation scope per write path in tests.

## Operating Rules For Future Batches

- Prefer additive changes over rewrites.
- Keep every batch small enough to verify with typecheck plus one or two focused functional checks.
- Only broaden invalidation when a narrower scope would risk stale merchant data.
- If a change affects storefront freshness, define the intended invalidation scope before editing code.
- If a write path touches multiple storefront surfaces, treat it as `all` until narrower coverage is proven safe.
