# Batch F Review Pack

Last updated: August 11, 2026

## Scope

This batch is the reviewable release slice for:
- Cloudflare-backed custom-domain proxy work,
- domain-routing KV support,
- domain backfill tooling,
- domain API integration changes.

## Exact Batch F Files In The Current Worktree

### Cloudflare worker and config

- `cloudflare/ezcomo-custom-domain-proxy/worker.js`
- `cloudflare/ezcomo-custom-domain-proxy/wrangler.jsonc`

### Domain routing and operator tooling

- `src/lib/domain-routing-kv.ts`
- `scripts/backfill-domain-routing-kv.ts`

### Domain API integration

- `src/app/api/domains/route.ts`

## Release Intent

Batch F should be reviewed and released as domain and Cloudflare infrastructure work. It should not be mixed with:
- storefront runtime scaling and queue work,
- storefront search rollout,
- CMS/editor restructuring,
- marketing/public page work,
- broad platform control-plane changes.

## Verification Baseline

Recommended focused verification for this batch:

- `npm.cmd run lint`
- `npm.cmd run typecheck -- --pretty false`
- targeted domain route coverage
- live verification against the Cloudflare-backed domain flow before production rollout

## Deployment Notes

- This batch is infra-sensitive and should be validated with real environment configuration, not just local compilation.
- Keep local `.wrangler` state ignored and out of review.
