# Production release / origin coherence

This runbook defines how EZComo prevents a healthy but stale origin from silently serving a superseded application release.

## Release identity

Every application origin exposes one non-secret immutable release SHA through `/api/health` as `release` and, when present, `x-ezcomo-release`.

Server precedence is:

1. `VERCEL_GIT_COMMIT_SHA`
2. `RENDER_GIT_COMMIT`
3. `EZCOMO_RELEASE_SHA`

Only a normalized full 40-character hexadecimal Git SHA is exposed. Malformed environment values produce `null`; provider environment dumps, branch names, commit messages, actors, URLs and proxy secrets are never returned.

## Worker routing contract

`EXPECTED_RELEASE_SHA` is an operator-controlled, non-secret Worker variable. It is not a substitute for `LB_PROXY_SECRET` and must never contain credentials.

When `EXPECTED_RELEASE_SHA` is unset, the Worker preserves the historical compatibility failover policy. When set to a valid full SHA, the Worker caches lightweight `/api/health` release probes for `RELEASE_PROBE_TTL_SECONDS` and selects an eligible origin before forwarding the shopper request.

- Matching healthy primary: send once to primary.
- Stale/unhealthy primary and matching healthy fallback: send once to fallback.
- Neither configured origin proves the expected release: return a degraded 503 instead of silently serving an arbitrary stale release.
- Malformed `EXPECTED_RELEASE_SHA`: fail degraded; never reinterpret it as compatibility mode.

The Worker never queries GitHub, Vercel or Render APIs per request.

## Mutation no-replay invariant

Release-aware preselection happens before the shopper request is dispatched and is therefore not a retry.

After an origin request has been attempted, mutation methods are never automatically sent to a second origin after transport failure or failover HTTP status. An order/payment mutation may already have committed even when the Worker did not receive a usable response.

GET, HEAD and OPTIONS may retain the existing transport failover behavior, but under release enforcement a fallback is eligible only when it also proves `EXPECTED_RELEASE_SHA`.

## Promotion

1. Deploy the intended Git SHA to the eligible production origin(s).
2. Verify each candidate origin returns HTTP 200 from `/api/health` and reports its own exact SHA in `release`.
3. Verify at least one explicitly configured serving origin reports the intended SHA.
4. Set `EXPECTED_RELEASE_SHA` to that exact SHA. Do not use prefixes or timestamps.
5. Smoke the real public merchant hostname (`*.ezcomo.shop`), not only `ezcomo.vercel.app`.
6. Confirm trusted forwarded-host behavior, tenant routing, shopper reads and mutation no-replay tests remain green.
7. Only then call the release globally production-ready.

Do not set `EXPECTED_RELEASE_SHA` ahead of an eligible origin: the correct result would be a fail-closed 503.

## Rollback

1. Choose the exact rollback Git SHA.
2. Verify an eligible origin already reports that exact SHA from `/api/health`.
3. Change `EXPECTED_RELEASE_SHA` to the rollback SHA.
4. Smoke a real merchant hostname and canonical health.
5. Keep mutation requests single-dispatch throughout rollback.

Release ordering is based on immutable identity, never timestamps.

## Cloudflare rollout boundary

Repository changes alone do not activate this policy. The deployed `ezcomo-origin-failover` Worker must be updated through an authorized Cloudflare management path, with an explicit verified `FALLBACK_ORIGIN_HOSTNAME` before release enforcement depends on fallback selection.

If Cloudflare access is unavailable, application `/api/health.release` can be production-verified and the Worker code can be merged, but issue #219 remains open until the live Worker configuration and actual merchant hostname prove release-aware selection.

Never manufacture Cloudflare credentials, expose `LB_PROXY_SECRET`, or weaken the trusted `x-ezcomo-hostname` proxy-secret contract to complete rollout.

## Custom-domain integration

Issue #221 custom-domain ingress must use the same release identity contract. A green DNS/SSL/custom-hostname state is insufficient if that hostname can still route to a healthy stale application release.

## Failure handling

- No origin proves expected release: degraded 503; operator verifies deployments/configuration before changing expected release.
- Release probe/cache failure: origin does not count as a proven release match.
- Primary transport/status failure after a safe read dispatch: fallback is allowed only under the existing safe-method policy and, when release enforcement is active, only if fallback proved the expected release.
- Mutation transport/status failure after dispatch: never replay automatically; use normal application/provider idempotency and reconciliation paths.
