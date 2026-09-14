# P0 billing authority handoff

Branch: `release/p0-billing-authority`

Production base: `4caa14c351cf0f7071e5b4ea14fb069a79403215`

Implementation checkpoint before this handoff: `a730f34f145ab85e5d75465273086bf418f901e3`

Owned blockers:

- #308 — client-authored SaaS invoice settlement / entitlement authority
- #314 — manual bKash transaction replay / missing DB uniqueness

## Implementation status

Code implementation is complete. No production deployment or `main` merge was performed from this lane.

#308 removes authenticated/anon mutation authority from `store_invoices`, adds a defense-in-depth trigger against client invoice DML, and protects the legacy `stores.plan` entitlement fallback from authenticated plan escalation while preserving ordinary permitted store updates.

#314 normalizes manual bKash transaction IDs, fails closed on ambiguous history, adds a global normalized uniqueness constraint, and makes the application routes idempotent under duplicate submission and concurrent unique-index races.
## Database proof

Disposable PostgreSQL 16.15 proof executed the exact #308 and #314 migration files.

Clean-history path passed:

- #308 and #314 applied successfully;
- manual bKash identity normalization passed;
- invalid provider identity rejection passed;
- authenticated invoice paid/amount mutation was rejected;
- authenticated legacy `stores.plan` escalation was rejected;
- service-role settlement remained functional.

Concurrent replay proof used two simultaneous sessions with case-equivalent transaction IDs. One transaction committed, the other received PostgreSQL unique violation `23505`, and the durable winner count was exactly one.

Dirty-history proof inserted one duplicate normalized transaction across two paid invoices. #314 aborted with `manual_bkash_transaction_reconciliation_required`, reporting one duplicate group and two paid rows. No paid row was deleted or auto-rewritten.
## Application proof

Final branch gates before handoff:

- targeted billing suite: 57/57 pass;
- TypeScript typecheck: pass;
- targeted ESLint: pass;
- `git diff --check`: pass;
- migration drift guard: pass;
- permanent rollback-only `billing_authority_smoke.sql` is wired into the DB smoke runner.
- `npm run billing:authority:preflight` provides a read-only fail-closed production reconciliation gate.
- `npm run billing:authority:postdeploy` provides a read-only effective-grant/trigger/index/constraint verification gate.
- both executable gates were proven against disposable PostgreSQL 16.15, including expected preflight failure on one duplicate group.

The repository-wide test command still contains the previously isolated storefront transactional-truth assertion failure. The billing branch does not modify either the failing storefront test or its component, so this lane did not take ownership of that unrelated baseline failure.

GitHub-hosted Database Smoke could not allocate a runner because the repository/account Actions billing or spending limit blocked the job before any steps started. This is external CI infrastructure; the local real-Postgres evidence above supplies the database proof for this lane, but hosted CI should still be rerun after the account condition is cleared.

## Production reconciliation dependency

Read-only production inspection on 2026-09-14 found exactly one normalized manual-bKash collision across two paid invoices:

- invoice `37a7b169-e0a9-459a-bd47-9d03b51a61d1`, store `9019275a-5093-4d34-8d9b-8ac6ab4b79c6`, historical plan `advanced`, amount BDT 1490;
- invoice `88ad0642-b51a-40f0-a17f-0b908c8631d5`, store `e23ed597-0ea9-4cb1-9fa4-c6fb1620de61`, historical plan `basic`, amount BDT 499.

Both are `paid`; neither has review metadata. Current subscriptions have changed since those invoices and cannot establish which historical invoice owns the real provider transaction. The raw provider transaction identity is intentionally not recorded in this handoff; obtain it from the discovery query in the rollout runbook.

Before production rollout, finance/operator review must compare both rows to the authoritative bKash record and correct only the proven bad historical fact. Do not choose by timestamp, amount, plan, or current subscription state.

Runbook: `docs/runbooks/p0-billing-authority-rollout.md`.

## Production closeout order

1. Reconcile the historical duplicate using the finance-authoritative record.
2. Confirm duplicate/missing/invalid manual bKash identity counts are all zero.
3. Apply #308 migration.
4. Verify effective invoice grants and client denial behavior.
5. Apply #314 migration.
6. Run DB smoke and one legitimate positive settlement/manual-review proof.
7. Refresh the production migration ledger.
8. Remove #308/#314 `pending-production` drift classifications only after production application is observed.
9. Rerun migration drift and hosted Database Smoke.
10. Only then mark #308/#314 production-closed.

## Coordination boundary

No R4 Section Studio, template, storefront composition, or R4 variant-option implementation was changed. The branch remains scoped to SaaS billing/settlement authority and replay protection.