-- Keep persisted carts inside the same quantity contract enforced at checkout.
-- This prevents authenticated clients from storing quantities that can never be
-- accepted by create_store_order_with_stock.

DO $$
DECLARE
  _invalid_count bigint;
BEGIN
  SELECT count(*)
    INTO _invalid_count
  FROM public.cart_items
  WHERE quantity < 1 OR quantity > 99;

  IF _invalid_count > 0 THEN
    RAISE EXCEPTION
      'cannot enforce cart item quantity range: % persisted rows are outside 1..99',
      _invalid_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'cart_items'
      AND c.conname = 'cart_items_quantity_range'
  ) THEN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_quantity_range
      CHECK (quantity BETWEEN 1 AND 99);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT cart_items_quantity_range ON public.cart_items IS
  'Persistent cart quantities match the storefront order input contract (1..99 per line).';
