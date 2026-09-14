-- Pin function name resolution so caller-controlled search_path cannot alter
-- storefront search or subscription renewal trigger behavior.

ALTER FUNCTION public.search_storefront_products(
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean,
  integer
)
SET search_path = pg_catalog, public;

ALTER FUNCTION public.protect_subscription_renewal_period()
SET search_path = pg_catalog, public;

COMMENT ON FUNCTION public.search_storefront_products(uuid, text, text, text, numeric, numeric, boolean, integer) IS
  'Storefront product search with a fixed pg_catalog/public search path.';

COMMENT ON FUNCTION public.protect_subscription_renewal_period() IS
  'Subscription renewal period guard with a fixed pg_catalog/public search path.';
