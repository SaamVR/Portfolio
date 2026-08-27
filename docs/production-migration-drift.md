# Production migration drift guard

`npm run migrations:drift` compares repository migrations with the last trusted production migration-ledger snapshot in `supabase/production-migration-ledger.json`.

## Identity rule

Migration **names**, not timestamp versions, are the stable identity. Historical MCP-applied migrations can have a production ledger timestamp different from the repository filename. The guard strips a leading 14-digit timestamp before comparison.

Only SQL files named with the repository migration convention (`NN_name.sql` or `YYYYMMDDHHMMSS_name.sql`) count as migrations. Rollback-only `*_smoke.sql` files in the migrations directory are test fixtures, not production migrations.

## Exceptions

Exceptions live in `supabase/migration-drift-policy.json` and require a reason.

- `non-production`: intentionally never applied to production. This is reserved for exceptional fixtures/seeds such as the retired fixed demo-store blog seed.
- `pending-production`: a real migration merged with application code but intentionally waiting for the production rollout step.

The guard fails when an exception is stale, when a `pending-production` migration is already in production, or when a `non-production` migration unexpectedly appears in production. That forces the policy and ledger snapshot to be reconciled instead of accumulating permanent bypasses.

## Normal migration rollout

1. Add the migration file.
2. If production cannot receive it before the PR gate, add a temporary `pending-production` exception with a concrete rollout reason.
3. Run `npm run migrations:drift`, unit tests, lint, and typecheck locally.
4. Merge only after the exact PR head is validated.
5. Apply the migration to production through the trusted Supabase migration path/MCP.
6. Read the production migration ledger from Supabase, canonicalize/deduplicate by migration name, and refresh `supabase/production-migration-ledger.json`.
7. Remove the matching `pending-production` exception.
8. Run `npm run migrations:drift` again and commit the reconciliation.

Do not edit the ledger snapshot merely to make the check pass. It represents observed production state, not desired state. No database password, service-role key, access token, or connection string belongs in either drift file.

## Production-only history

The guard reports migration names present in production but absent from the current repository as informational historical drift. They do not hide repository migrations missing from production and do not fail the gate by themselves.
