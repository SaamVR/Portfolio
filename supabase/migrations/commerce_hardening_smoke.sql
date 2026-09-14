DO $$
DECLARE
  _write_policy_count integer;
  _manual_claim_pk text;
  _store_fk text;
  _order_fk text;
BEGIN
  IF has_table_privilege('anon', 'public.orders', 'INSERT')
     OR has_table_privilege('anon', 'public.orders', 'UPDATE')
     OR has_table_privilege('anon', 'public.orders', 'DELETE')
     OR has_table_privilege('authenticated', 'public.orders', 'INSERT')
     OR has_table_privilege('authenticated', 'public.orders', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.orders', 'DELETE') THEN
    RAISE EXCEPTION 'client roles still have direct order mutation privileges';
  END IF;

  SELECT count(*)::integer INTO _write_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'orders'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');
  IF _write_policy_count <> 0 THEN
    RAISE EXCEPTION 'orders still has % direct write policies', _write_policy_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'coupon_codes'
      AND indexname = 'idx_coupon_codes_store_code_unique'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(store_id, code)%'
  ) THEN
    RAISE EXCEPTION 'store-scoped coupon uniqueness index is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'coupon_codes'
      AND indexname = 'coupon_codes_code_key'
  ) THEN
    RAISE EXCEPTION 'legacy global coupon uniqueness still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'cart_items'
      AND c.conname = 'cart_items_quantity_range'
      AND pg_get_constraintdef(c.oid) ILIKE '%quantity >= 1%'
      AND pg_get_constraintdef(c.oid) ILIKE '%quantity <= 99%'
  ) THEN
    RAISE EXCEPTION 'cart quantity range constraint is missing';
  END IF;

  IF to_regclass('public.storefront_manual_payment_claims') IS NULL THEN
    RAISE EXCEPTION 'manual payment claim ledger is missing';
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO _manual_claim_pk
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'storefront_manual_payment_claims'
    AND c.contype = 'p';
  IF _manual_claim_pk IS NULL OR _manual_claim_pk NOT ILIKE '%(provider, normalized_reference)%' THEN
    RAISE EXCEPTION 'manual payment claim identity is not globally provider/reference unique';
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO _store_fk
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'storefront_manual_payment_claims'
    AND c.contype = 'f' AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES stores%';
  SELECT pg_get_constraintdef(c.oid) INTO _order_fk
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'storefront_manual_payment_claims'
    AND c.contype = 'f' AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES orders%';
  IF _store_fk NOT ILIKE '%ON DELETE SET NULL%' OR _order_fk NOT ILIKE '%ON DELETE SET NULL%' THEN
    RAISE EXCEPTION 'consumed manual payment claims do not survive related record deletion';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'orders'
      AND t.tgname = 'trg_claim_storefront_manual_payment_reference'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'manual payment claim trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'products'
      AND c.conname = 'products_price_nonnegative'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'products'
      AND c.conname = 'products_stock_nonnegative'
  ) THEN
    RAISE EXCEPTION 'product numeric integrity constraints are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'cart_items'
      AND c.conname = 'cart_items_product_store_fkey'
      AND pg_get_constraintdef(c.oid) ILIKE '%FOREIGN KEY (product_id, store_id)%'
      AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES products(id, store_id)%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'stock_notifications'
      AND c.conname = 'stock_notifications_product_store_fkey'
      AND pg_get_constraintdef(c.oid) ILIKE '%FOREIGN KEY (product_id, store_id)%'
      AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES products(id, store_id)%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'product_qa'
      AND c.conname = 'product_qa_product_store_fkey'
      AND pg_get_constraintdef(c.oid) ILIKE '%FOREIGN KEY (product_id, store_id)%'
      AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES products(id, store_id)%'
  ) THEN
    RAISE EXCEPTION 'product-linked rows are missing store/product composite foreign keys';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('cart_items', 'stock_notifications', 'product_qa')
      AND column_name = 'store_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'product-linked store_id columns remain nullable';
  END IF;
END;
$$;
