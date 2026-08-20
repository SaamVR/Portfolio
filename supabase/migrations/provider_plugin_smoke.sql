DO $$
DECLARE
  _constraint_count integer;
  _generic_constraint_count integer;
  _brand_locked_count integer;
BEGIN
  SELECT count(*)
    INTO _constraint_count
  FROM pg_constraint
  WHERE conname IN (
    'store_payment_connections_secure_provider_check',
    'platform_payment_connections_secure_provider_check',
    'store_courier_connections_provider_check',
    'store_courier_credentials_secure_provider_check',
    'order_shipments_provider_check'
  );

  IF _constraint_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 provider id constraints, found %', _constraint_count;
  END IF;

  SELECT count(*)
    INTO _generic_constraint_count
  FROM pg_constraint
  WHERE conname IN (
    'store_payment_connections_secure_provider_check',
    'platform_payment_connections_secure_provider_check',
    'store_courier_connections_provider_check',
    'store_courier_credentials_secure_provider_check',
    'order_shipments_provider_check'
  )
    AND pg_get_constraintdef(oid) LIKE '%provider ~%';

  IF _generic_constraint_count <> 5 THEN
    RAISE EXCEPTION 'Provider constraints are not all format-based';
  END IF;

  SELECT count(*)
    INTO _brand_locked_count
  FROM pg_constraint
  WHERE conname IN (
    'store_payment_connections_secure_provider_check',
    'platform_payment_connections_secure_provider_check',
    'store_courier_connections_provider_check',
    'store_courier_credentials_secure_provider_check',
    'order_shipments_provider_check'
  )
    AND (
      pg_get_constraintdef(oid) ILIKE '%bkash%'
      OR pg_get_constraintdef(oid) ILIKE '%pathao%'
      OR pg_get_constraintdef(oid) ILIKE '%steadfast%'
      OR pg_get_constraintdef(oid) ILIKE '%redx%'
      OR pg_get_constraintdef(oid) ILIKE '%paperfly%'
    );

  IF _brand_locked_count <> 0 THEN
    RAISE EXCEPTION 'Provider schema still enumerates provider brands';
  END IF;
END
$$;
