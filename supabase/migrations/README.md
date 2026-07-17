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
- `rls_smoke_can_manage_store.sql` is a rollback-only live-policy smoke test for owner/admin/editor/viewer/outsider/platform-admin access across the main tenant-managed tables. Run it with `npm run test:db:rls` against a local or dev Postgres URL.
- `npm run test:db` is the combined local DB preflight. It runs the tenant RLS smoke first and then the billing route smoke so release checks cover both isolation and paid-plan activation flow.
