-- Enforce store/product tenant consistency for product-linked commerce rows.
--
-- product_reviews already carries composite (product_id, store_id) foreign-key
-- authority. Apply the same invariant to the remaining product-linked tables so
-- a caller cannot persist Store A metadata that references a Store B product.

DO $$
DECLARE
  _bad record;
BEGIN
  SELECT 'cart_items'::text AS table_name, c.id AS row_id
  INTO _bad
  FROM public.cart_items c
  LEFT JOIN public.products p ON p.id = c.product_id
  WHERE c.store_id IS NULL
     OR c.product_id IS NULL
     OR p.id IS NULL
     OR p.store_id IS DISTINCT FROM c.store_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT 'stock_notifications'::text AS table_name, s.id AS row_id
    INTO _bad
    FROM public.stock_notifications s
    LEFT JOIN public.products p ON p.id = s.product_id
    WHERE s.store_id IS NULL
       OR s.product_id IS NULL
       OR p.id IS NULL
       OR p.store_id IS DISTINCT FROM s.store_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT 'product_qa'::text AS table_name, q.id AS row_id
    INTO _bad
    FROM public.product_qa q
    LEFT JOIN public.products p ON p.id = q.product_id
    WHERE q.store_id IS NULL
       OR q.product_id IS NULL
       OR p.id IS NULL
       OR p.store_id IS DISTINCT FROM q.store_id
    LIMIT 1;
  END IF;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot enforce product tenant consistency: % row % has missing/mismatched store-product identity',
      _bad.table_name,
      _bad.row_id;
  END IF;
END;
$$;

ALTER TABLE public.cart_items
  ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.stock_notifications
  ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.product_qa
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_product_store_fkey,
  ADD CONSTRAINT cart_items_product_store_fkey
    FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id)
    ON DELETE CASCADE;

ALTER TABLE public.stock_notifications
  DROP CONSTRAINT IF EXISTS stock_notifications_product_store_fkey,
  ADD CONSTRAINT stock_notifications_product_store_fkey
    FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id)
    ON DELETE CASCADE;

ALTER TABLE public.product_qa
  DROP CONSTRAINT IF EXISTS product_qa_product_store_fkey,
  ADD CONSTRAINT product_qa_product_store_fkey
    FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id)
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT cart_items_product_store_fkey ON public.cart_items IS
  'Prevents a customer cart row from pairing one store with another store''s product.';
COMMENT ON CONSTRAINT stock_notifications_product_store_fkey ON public.stock_notifications IS
  'Prevents stock notification rows from crossing the product tenant boundary.';
COMMENT ON CONSTRAINT product_qa_product_store_fkey ON public.product_qa IS
  'Database-level tenant consistency for product questions, complementing RLS checks.';
