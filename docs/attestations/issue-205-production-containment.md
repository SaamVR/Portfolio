# Issue #205 production containment

Production Supabase project `sndqmhxqvlpcogcnklss` is protected by three migrations applied on 2026-08-30 UTC:

- `20260830175313_reject_inactive_new_store_plans_205`
- `20260830175605_reject_contact_only_new_store_plans_205`
- `20260830182831_relock_subscription_truth_205`

Verified invariants:

- New `stores.plan` values must resolve to an active `cms_plans` row.
- New stores cannot self-select `contact_only` plans.
- `anon` has no privileges on `store_subscriptions`.
- `authenticated` has `SELECT` only on `store_subscriptions`; INSERT/UPDATE/DELETE are revoked.
- `service_role` retains server-authoritative subscription writes.
- RLS is enabled and the only client policy on `store_subscriptions` is SELECT.
- Backup subscription replacement is gated by platform full-admin preflight and service-role-only restore RPC execution.

The database boundary is authoritative even if a stale caller submits an inactive, unknown, or support-only plan id.
