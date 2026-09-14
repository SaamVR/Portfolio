-- Rollback-free metadata smoke for commerce function security contracts.
DO $$
DECLARE
  _search_oid oid;
  _renewal_oid oid;
  _legacy_coupon_oid oid;
  _scoped_coupon_oid oid;
BEGIN
  SELECT p.oid INTO _search_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_storefront_products'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, text, numeric, numeric, boolean, integer';

  IF _search_oid IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE((SELECT proconfig FROM pg_proc WHERE oid = _search_oid), '{}'::text[])) AS setting
    WHERE setting = 'search_path=pg_catalog, public'
  ) THEN
    RAISE EXCEPTION 'search_storefront_products does not have the fixed pg_catalog/public search_path';
  END IF;

  SELECT p.oid INTO _renewal_oid
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'protect_subscription_renewal_period'
    AND pg_get_function_identity_arguments(p.oid) = '';
  IF _renewal_oid IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE((SELECT proconfig FROM pg_proc WHERE oid = _renewal_oid), '{}'::text[])) AS setting
    WHERE setting = 'search_path=pg_catalog, public'
  ) THEN
    RAISE EXCEPTION 'protect_subscription_renewal_period does not have the fixed pg_catalog/public search_path';
  END IF;

  SELECT p.oid INTO _legacy_coupon_oid
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'validate_coupon'
    AND pg_get_function_identity_arguments(p.oid) = 'text, integer';
  SELECT p.oid INTO _scoped_coupon_oid
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'validate_coupon'
    AND pg_get_function_identity_arguments(p.oid) = 'text, integer, uuid';

  IF _legacy_coupon_oid IS NULL
     OR has_function_privilege('anon', _legacy_coupon_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', _legacy_coupon_oid, 'EXECUTE')
     OR NOT has_function_privilege('service_role', _legacy_coupon_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy two-argument validate_coupon ACL is not service-role-only';
  END IF;

  IF _scoped_coupon_oid IS NULL
     OR NOT has_function_privilege('anon', _scoped_coupon_oid, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', _scoped_coupon_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'store-scoped validate_coupon is not available to storefront roles';
  END IF;
END;
$$;
