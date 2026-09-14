-- Cart-recovery delivery messages are execution records, not merchant-authored rows.
-- Queue creation and delivery status changes are governed by server/service-role paths.

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.store_cart_recovery_messages
  FROM anon, authenticated;

DROP POLICY IF EXISTS "Store staff can manage cart recovery messages"
  ON public.store_cart_recovery_messages;

DO $$
DECLARE
  write_policy_count integer;
BEGIN
  SELECT count(*)::integer INTO write_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'store_cart_recovery_messages'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF write_policy_count <> 0 THEN
    RAISE EXCEPTION 'cart recovery messages still expose % direct write policies', write_policy_count;
  END IF;
END;
$$;

COMMENT ON TABLE public.store_cart_recovery_messages IS
  'Server-governed cart recovery delivery ledger. Merchant clients may read authorized rows but cannot directly queue or mutate delivery truth.';
