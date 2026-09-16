# Organized SQL Packs

These files are the cleaned, CMS-oriented SQL packs for the current architecture.

They do **not** replace the chronological files in `supabase/migrations/`, because Supabase still needs those migrations in timestamp order.

Use this folder for:

- understanding the current database shape
- reviewing the CMS schema by responsibility
- planning future changes without digging through legacy single-store history

## Recommended Reading Order

1. `01_platform_core.sql`
2. `02_store_tenancy.sql`
3. `03_storefront_cms.sql`
4. `04_store_scoped_commerce.sql`
5. `05_functions_and_policies.sql`
6. `06_seed_defaults.sql`

## Notes

- `supabase/migrations/` remains the deployable history.
- This folder is the organized reference layer.
- The legacy single-store tables were kept and upgraded with `store_id` so the CMS can evolve without a destructive rewrite.
- `store_role_capability_matrix_smoke.sql` is the rollback-only live-policy smoke for the launch merchant role contract: owner/admin administration, editor content/fulfillment authority, viewer non-sensitive read-only access, unrelated-store denial, and platform-admin access.
- `rls_smoke_cross_tenant.sql` remains the separate tenant-isolation smoke. The older `rls_smoke_can_manage_store.sql` is retained as historical coverage but is no longer run because it encoded the obsolete assumption that editors were full store managers.
- `npm run test:db:rls` runs the registered RLS/security/commerce smokes from `scripts/run-rls-smoke.mjs` against a local or dev Postgres URL.
- `npm run test:db` is the combined local DB preflight so release checks cover tenant isolation, capability boundaries, commerce authority, and billing activation flow.
