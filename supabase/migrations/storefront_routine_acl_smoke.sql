-- Rollback-only regression smoke for #261/#262 storefront routine ACLs.
-- This intentionally uses the real anon role and leaves no committed fixtures.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION '%', message;
  END IF;
END;
$$;

SELECT pg_temp.assert_true(
  has_function_privilege('anon', 'public.can_manage_store(uuid,uuid)', 'EXECUTE'),
  'anon must execute caller-bound can_manage_store for public RLS'
);
SELECT pg_temp.assert_true(
  has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE'),
  'anon must execute caller-bound has_role enum overload for public RLS'
);
SELECT pg_temp.assert_true(
  has_function_privilege('anon', 'public.validate_coupon(text,integer,uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.validate_coupon(text,integer,uuid)', 'EXECUTE'),
  'store-scoped coupon helper must remain available to storefront callers'
);
SELECT pg_temp.assert_true(
  NOT has_function_privilege('anon', 'public.validate_coupon(text,integer)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.validate_coupon(text,integer)', 'EXECUTE'),
  'legacy cross-store coupon helper must not be browser executable'
);
SELECT pg_temp.assert_true(
  has_function_privilege('service_role', 'public.validate_coupon(text,integer)', 'EXECUTE'),
  'trusted service-role legacy compatibility must remain intact'
);

-- Keep this ACL/RLS smoke independent of eventual paid-beta activation state.
UPDATE public.platform_policy_config
SET binding = false
WHERE singleton = true;
UPDATE public.platform_jurisdiction_enforcement_config
SET country_enforcement_enabled = false
WHERE singleton = true;

INSERT INTO public.stores (id, owner_id, name, slug, plan, store_type, is_published)
VALUES
  ('91000000-0000-4000-8000-000000000001', NULL, 'ACL Smoke Published', 'acl-smoke-published-261-262', 'free', 'general-catalog', true),
  ('91000000-0000-4000-8000-000000000002', NULL, 'ACL Smoke Private', 'acl-smoke-private-261-262', 'free', 'general-catalog', false);

INSERT INTO public.coupon_codes (
  id, store_id, code, discount_type, discount_value, min_order, is_active
)
VALUES
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'ACL261A', 'fixed', 25, 0, true),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'ACL261B', 'fixed', 30, 0, true);

SET LOCAL ROLE anon;

SELECT pg_temp.assert_true(
  public.can_manage_store('91000000-0000-4000-8000-000000000001', NULL) = false,
  'anonymous can_manage_store evaluation must be false, not raise 42501'
);
SELECT pg_temp.assert_true(
  public.has_role(NULL, 'admin'::public.app_role) = false,
  'anonymous has_role evaluation must be false, not raise 42501'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) FROM public.stores WHERE id = '91000000-0000-4000-8000-000000000001') = 1,
  'anon must read published storefront rows through existing RLS'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) FROM public.stores WHERE id = '91000000-0000-4000-8000-000000000002') = 0,
  'anon must not read unpublished storefront rows'
);
SELECT pg_temp.assert_true(
  public.validate_coupon('ACL261A', 1000, '91000000-0000-4000-8000-000000000001')->>'id'
    = '92000000-0000-4000-8000-000000000001',
  'store-scoped guest coupon helper must return the matching store coupon'
);
SELECT pg_temp.assert_true(
  public.validate_coupon('ACL261A', 1000, '91000000-0000-4000-8000-000000000002')->>'error'
    = 'Invalid or expired coupon code.',
  'store-scoped guest coupon helper must reject a coupon from another store'
);

RESET ROLE;
ROLLBACK;
