-- Make server-side order routes the only mutation authority for durable orders.
-- Merchant/shopper clients keep RLS-governed reads; service_role routes retain
-- creation, lifecycle transition, courier and reconciliation authority.

DROP POLICY IF EXISTS "Store managers can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Store staff can update store orders" ON public.orders;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders FROM anon, authenticated;
GRANT SELECT ON TABLE public.orders TO anon, authenticated;

-- The remaining read policies are intentionally preserved:
--   * Customers can view own store orders
--   * Store staff can view all store orders
-- No direct client policy may grant INSERT/UPDATE/DELETE after this migration.

DO $$
DECLARE
  _write_policy_count integer;
BEGIN
  SELECT count(*)::integer
    INTO _write_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'orders'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF _write_policy_count <> 0 THEN
    RAISE EXCEPTION
      'orders still exposes % direct client write policies after mutation lock-down',
      _write_policy_count;
  END IF;
END;
$$;

COMMENT ON TABLE public.orders IS
  'Authoritative order ledger. Client roles are read-only; creation and lifecycle mutations must pass through governed service-role server routes/RPCs.';
