-- Enforce that review references remain inside the review row's tenant.
-- Product and order ids are globally unique, but tenant-owned rows must not be
-- able to associate a review with another store's product or order.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_reviews pr
    JOIN public.products p ON p.id = pr.product_id
    WHERE pr.store_id IS DISTINCT FROM p.store_id
  ) THEN
    RAISE EXCEPTION 'Cannot enforce product-review tenant consistency: product/store mismatches exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_reviews pr
    JOIN public.orders o ON o.id = pr.order_id
    WHERE pr.order_id IS NOT NULL
      AND pr.store_id IS DISTINCT FROM o.store_id
  ) THEN
    RAISE EXCEPTION 'Cannot enforce product-review tenant consistency: order/store mismatches exist';
  END IF;
END
$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_id_store_id_key UNIQUE (id, store_id);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_id_store_id_key UNIQUE (id, store_id);

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_product_store_fkey
  FOREIGN KEY (product_id, store_id)
  REFERENCES public.products(id, store_id)
  ON DELETE CASCADE;

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_order_store_fkey
  FOREIGN KEY (order_id, store_id)
  REFERENCES public.orders(id, store_id)
  ON DELETE CASCADE;
