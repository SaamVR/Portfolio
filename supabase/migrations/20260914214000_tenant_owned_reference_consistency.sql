-- Enforce tenant consistency for remaining UUID-backed order/product references.
-- Preserve each table's existing deletion semantics while preventing Store A rows
-- from referencing Store B orders/products.

DO $$
DECLARE
  _bad record;
BEGIN
  SELECT 'order_shipments'::text AS table_name, s.id AS row_id
  INTO _bad
  FROM public.order_shipments s
  LEFT JOIN public.orders o ON o.id = s.order_id
  WHERE o.id IS NULL OR o.store_id IS DISTINCT FROM s.store_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT 'store_revenue_events'::text AS table_name, r.id AS row_id
    INTO _bad
    FROM public.store_revenue_events r
    LEFT JOIN public.orders o ON o.id = r.order_id
    WHERE o.id IS NULL OR o.store_id IS DISTINCT FROM r.store_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT 'store_analytics_events'::text AS table_name, a.id AS row_id
    INTO _bad
    FROM public.store_analytics_events a
    LEFT JOIN public.orders o ON o.id = a.order_id
    LEFT JOIN public.products p ON p.id = a.product_id
    WHERE (a.order_id IS NOT NULL AND (o.id IS NULL OR o.store_id IS DISTINCT FROM a.store_id))
       OR (a.product_id IS NOT NULL AND (p.id IS NULL OR p.store_id IS DISTINCT FROM a.store_id))
    LIMIT 1;
  END IF;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot enforce tenant-owned reference consistency: % row % crosses or misses its store-owned reference',
      _bad.table_name,
      _bad.row_id;
  END IF;
END;
$$;

ALTER TABLE public.order_shipments
  DROP CONSTRAINT IF EXISTS order_shipments_order_store_fkey,
  ADD CONSTRAINT order_shipments_order_store_fkey
    FOREIGN KEY (order_id, store_id)
    REFERENCES public.orders(id, store_id)
    ON DELETE CASCADE;

ALTER TABLE public.store_revenue_events
  DROP CONSTRAINT IF EXISTS store_revenue_events_order_store_fkey,
  ADD CONSTRAINT store_revenue_events_order_store_fkey
    FOREIGN KEY (order_id, store_id)
    REFERENCES public.orders(id, store_id)
    ON DELETE CASCADE;

ALTER TABLE public.store_analytics_events
  DROP CONSTRAINT IF EXISTS store_analytics_events_order_store_fkey,
  ADD CONSTRAINT store_analytics_events_order_store_fkey
    FOREIGN KEY (order_id, store_id)
    REFERENCES public.orders(id, store_id)
    ON DELETE SET NULL (order_id),
  DROP CONSTRAINT IF EXISTS store_analytics_events_product_store_fkey,
  ADD CONSTRAINT store_analytics_events_product_store_fkey
    FOREIGN KEY (product_id, store_id)
    REFERENCES public.products(id, store_id)
    ON DELETE SET NULL (product_id);

COMMENT ON CONSTRAINT order_shipments_order_store_fkey ON public.order_shipments IS
  'Shipment order references must belong to the same store; order deletion still cascades shipments.';
COMMENT ON CONSTRAINT store_revenue_events_order_store_fkey ON public.store_revenue_events IS
  'Revenue-event order references must belong to the same store; order deletion preserves existing cascade semantics.';
COMMENT ON CONSTRAINT store_analytics_events_order_store_fkey ON public.store_analytics_events IS
  'Analytics order references must belong to the event store; deleted orders clear only order_id so store attribution survives.';
COMMENT ON CONSTRAINT store_analytics_events_product_store_fkey ON public.store_analytics_events IS
  'Analytics product references must belong to the event store; deleted products clear only product_id so store attribution survives.';
