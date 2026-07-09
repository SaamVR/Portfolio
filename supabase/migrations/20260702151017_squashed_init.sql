-- Compatibility migration kept for history continuity.
-- The canonical schema is now defined by the modular migration packs
-- 01_platform_core.sql through 06_seed_defaults.sql plus subsequent targeted
-- migrations. This squashed snapshot duplicated that schema and is now a no-op
-- to avoid replaying the same objects twice during fresh bootstrap.

DO $$
BEGIN
  RAISE NOTICE 'Skipping squashed snapshot migration 20260702151017_squashed_init.sql; canonical modular migrations already applied.';
END
$$;
