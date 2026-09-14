DO $$
DECLARE
  _definition text;
  _constraint_name text;
BEGIN
  FOREACH _constraint_name IN ARRAY ARRAY[
    'cart_items_product_store_fkey',
    'stock_notifications_product_store_fkey',
    'product_qa_product_store_fkey',
    'order_shipments_order_store_fkey',
    'store_revenue_events_order_store_fkey',
    'store_analytics_events_order_store_fkey',
    'store_analytics_events_product_store_fkey',
    'order_shipments_courier_connection_store_fkey',
    'store_courier_credentials_secure_connection_store_fkey',
    'store_cart_recovery_leads_recovered_order_store_fkey',
    'store_cart_recovery_messages_lead_store_fkey',
    'product_categories_parent_store_fkey'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND c.conname = _constraint_name
        AND c.contype = 'f'
    ) THEN
      RAISE EXCEPTION 'tenant consistency foreign key % is missing', _constraint_name;
    END IF;
  END LOOP;

  FOREACH _constraint_name IN ARRAY ARRAY[
    'store_courier_connections_id_store_id_key',
    'store_cart_recovery_leads_id_store_id_key',
    'product_categories_id_store_id_key'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND c.conname = _constraint_name
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%UNIQUE (id, store_id)%'
    ) THEN
      RAISE EXCEPTION 'tenant composite identity key % is missing', _constraint_name;
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

  SELECT pg_get_constraintdef(c.oid) INTO _definition
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'order_shipments'
    AND c.conname = 'order_shipments_courier_connection_store_fkey';
  IF _definition NOT ILIKE '%ON DELETE SET NULL (courier_connection_id)%' THEN
    RAISE EXCEPTION 'shipment courier tenant FK does not preserve shipment store attribution: %', _definition;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO _definition
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'store_cart_recovery_leads'
    AND c.conname = 'store_cart_recovery_leads_recovered_order_store_fkey';
  IF _definition NOT ILIKE '%ON DELETE SET NULL (recovered_order_id)%' THEN
    RAISE EXCEPTION 'recovery lead order tenant FK does not preserve lead store attribution: %', _definition;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO _definition
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'product_categories'
    AND c.conname = 'product_categories_parent_store_fkey';
  IF _definition NOT ILIKE '%ON DELETE SET NULL (parent_id)%' THEN
    RAISE EXCEPTION 'category parent tenant FK does not preserve category store attribution: %', _definition;
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
