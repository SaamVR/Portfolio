# Worktree Cleanup Plan

Last updated: August 11, 2026

## Objective

Turn the current dirty worktree into a professional, reviewable codebase without deleting active product work or mixing unrelated changes into a single release.

## What Is Safe To Clean Immediately

- Local smoke-test artifacts in `.tmp-smoke/`
- Cloudflare local runtime state under `cloudflare/**/.wrangler/`
- Generated reports that are only useful as temporary operator output when they are not referenced by docs or scripts

## What Should Not Be Cleaned Blindly

- New API routes under `src/app/api/**`
- New queue and deferred-processing code under `src/lib/orders/**`, `src/lib/notifications/**`, and `src/lib/cart-recovery/**`
- Storefront search, caching, and resolver work
- CMS editor and template migrations
- Supabase migrations and generated types
- Cloudflare worker source under `cloudflare/ezcomo-custom-domain-proxy/worker.js`

## Recommended Cleanup Structure

### Batch 1: Transient artifact cleanup

- Ignore and remove local smoke screenshots, logs, and HTML captures
- Ignore Cloudflare local state directories
- Keep only durable docs and source files in the worktree

### Batch 2: Scalability and caching isolation

- Group storefront resolver, cache invalidation, queue dispatch, and processor changes into one reviewable batch
- Keep related tests with these files
- Keep supporting env-example updates with this batch

### Batch 3: Search isolation

- Group Postgres storefront search code, sync scripts, and search migrations together
- Keep search docs with search code, not mixed into CMS/editor work

### Batch 4: CMS/editor isolation

- Group template retirement, editor restructuring, onboarding, and theme tooling changes together
- Verify runtime entrypoints before deleting any retired blueprint code

### Batch 5: Marketing and public-site isolation

- Group landing pages, FAQ/how-it-works, and public marketing assets separately from commerce runtime work
- Keep visual/brand changes out of backend or infra releases

### Batch 6: Database and operational hygiene

- Separate schema migrations by concern: search, rate limiting, notifications, template retirement
- Re-generate and verify Supabase types after migration grouping is settled

## Review Rules

- Do not delete files only because a report says they look unused
- Do not mix generated artifacts, screenshots, or runtime logs into product commits
- Do not mix infrastructure, CMS, storefront runtime, and marketing changes unless they are tightly coupled
- Keep each batch small enough to validate with focused tests, not just a broad typecheck

## Current Recommendation

The repo should be normalized through staged cleanup batches, not one giant cleanup commit. The safe immediate win is removing transient local artifacts from version control scope and then carving the remaining work into reviewable feature groups.
