DO $$
DECLARE
  _definition text;
  _result_definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid), pg_get_function_result(p.oid)
    INTO _definition, _result_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_store_order_with_stock_v2'
  LIMIT 1;

  IF _definition IS NULL THEN
    RAISE EXCEPTION 'create_store_order_with_stock_v2 is missing';
  END IF;

  IF _definition NOT ILIKE '%pg_advisory_xact_lock%' THEN
    RAISE EXCEPTION 'checkout recovery RPC does not serialize request-key retries';
  END IF;

  IF _definition NOT ILIKE '%checkout recovery conflict%' THEN
    RAISE EXCEPTION 'checkout recovery RPC does not reject mismatched retries';
  END IF;

  IF _definition NOT ILIKE '%create_store_order_with_stock(%' THEN
    RAISE EXCEPTION 'checkout recovery RPC no longer delegates fresh creation to canonical stock authority';
  END IF;

  IF _result_definition NOT ILIKE '%payment_method text%'
    OR _result_definition NOT ILIKE '%status text%'
    OR _result_definition NOT ILIKE '%replayed boolean%'
  THEN
    RAISE EXCEPTION 'checkout recovery RPC does not expose persisted payment state and replay status';
  END IF;
END
$$;
