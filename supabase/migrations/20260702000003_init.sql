-- Compatibility migration kept for history continuity.
-- The canonical schema is now defined by:
-- - 01_platform_core.sql
-- - 02_store_tenancy.sql
-- - 03_storefront_cms.sql
-- - 04_store_scoped_commerce.sql
-- - 05_functions_and_policies.sql
-- - 06_seed_defaults.sql
--
-- This legacy snapshot previously duplicated the same schema and caused fresh
-- bootstrap failures when applied after the modular packs above.
-- Intentionally left as a no-op for clean installs and CI resets.

DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy snapshot migration 20260702000003_init.sql; canonical modular migrations already applied.';
END
$$;
