DO $$
DECLARE
  _definition text;
BEGIN
  FOREACH _definition IN ARRAY ARRAY[
    'cart_items_product_store_fkey',
    'stock_notifications_product_store_fkey',
    'product_qa_product_store_fkey',
    'order_shipments_order_store_fkey',
    'store_revenue_events_order_store_fkey',
    'store_analytics_events_order_store_fkey',
    'store_analytics_events_product_store_fkey'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND c.conname = _definition
        AND c.contype = 'f'
    ) THEN
      RAISE EXCEPTION 'tenant consistency foreign key % is missing', _definition;
    END IF;
  END LOOP;

  SELECT pg_get_constraintdef(c.oid) INTO _definition
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'store_analytics_events'
    AND c.conname = 'store_analytics_events_order_store_fkey';
  IF _definition NOT ILIKE '%FOREIGN KEY (order_id, store_id)%'
     OR _definition NOT ILIKE '%REFERENCES orders(id, store_id)%'
     OR _definition NOT ILIKE '%ON DELETE SET NULL (order_id)%' THEN
    RAISE EXCEPTION 'analytics order tenant FK does not preserve store attribution: %', _definition;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO _definition
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'store_analytics_events'
    AND c.conname = 'store_analytics_events_product_store_fkey';
  IF _definition NOT ILIKE '%FOREIGN KEY (product_id, store_id)%'
     OR _definition NOT ILIKE '%REFERENCES products(id, store_id)%'
     OR _definition NOT ILIKE '%ON DELETE SET NULL (product_id)%' THEN
    RAISE EXCEPTION 'analytics product tenant FK does not preserve store attribution: %', _definition;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('cart_items', 'stock_notifications', 'product_qa')
      AND column_name = 'store_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'store_id remains nullable on product-linked commerce rows';
  END IF;
END;
$$;
