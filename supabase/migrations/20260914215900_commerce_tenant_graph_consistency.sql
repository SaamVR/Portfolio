-- Close remaining commerce-adjacent cross-tenant reference paths.
-- Existing globally unique UUID primary keys do not prove that the row's store_id
-- agrees with the referenced tenant-owned row. Composite FKs make that invariant
-- database-authoritative while preserving existing delete behavior.

DO $$
DECLARE
  _bad record;
BEGIN
  SELECT 'order_shipments.courier_connection_id'::text AS relation, s.id AS row_id
  INTO _bad
  FROM public.order_shipments s
  LEFT JOIN public.store_courier_connections c ON c.id = s.courier_connection_id
  WHERE s.courier_connection_id IS NOT NULL
    AND (c.id IS NULL OR c.store_id IS DISTINCT FROM s.store_id)
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT 'store_courier_credentials_secure.connection_id', sc.connection_id
    INTO _bad
    FROM public.store_courier_credentials_secure sc
    LEFT JOIN public.store_courier_connections c ON c.id = sc.connection_id
    WHERE sc.connection_id IS NOT NULL
      AND (c.id IS NULL OR c.store_id IS DISTINCT FROM sc.store_id)
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT 'store_cart_recovery_leads.recovered_order_id', l.id
    INTO _bad
    FROM public.store_cart_recovery_leads l
    LEFT JOIN public.orders o ON o.id = l.recovered_order_id
    WHERE l.recovered_order_id IS NOT NULL
      AND (o.id IS NULL OR o.store_id IS DISTINCT FROM l.store_id)
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT 'store_cart_recovery_messages.lead_id', m.id
    INTO _bad
    FROM public.store_cart_recovery_messages m
    LEFT JOIN public.store_cart_recovery_leads l ON l.id = m.lead_id
    WHERE m.lead_id IS NOT NULL
      AND (l.id IS NULL OR l.store_id IS DISTINCT FROM m.store_id)
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT 'product_categories.parent_id', c.id
    INTO _bad
    FROM public.product_categories c
    LEFT JOIN public.product_categories p ON p.id = c.parent_id
    WHERE c.parent_id IS NOT NULL
      AND (p.id IS NULL OR p.store_id IS DISTINCT FROM c.store_id)
    LIMIT 1;
  END IF;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot enforce commerce tenant graph consistency: % row % crosses or misses its store-owned reference',
      _bad.relation,
      _bad.row_id;
  END IF;
END;
$$;

ALTER TABLE public.store_courier_connections
  DROP CONSTRAINT IF EXISTS store_courier_connections_id_store_id_key,
  ADD CONSTRAINT store_courier_connections_id_store_id_key UNIQUE (id, store_id);

ALTER TABLE public.store_cart_recovery_leads
  DROP CONSTRAINT IF EXISTS store_cart_recovery_leads_id_store_id_key,
  ADD CONSTRAINT store_cart_recovery_leads_id_store_id_key UNIQUE (id, store_id);

ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS product_categories_id_store_id_key,
  ADD CONSTRAINT product_categories_id_store_id_key UNIQUE (id, store_id);

ALTER TABLE public.order_shipments
  DROP CONSTRAINT IF EXISTS order_shipments_courier_connection_store_fkey,
  ADD CONSTRAINT order_shipments_courier_connection_store_fkey
    FOREIGN KEY (courier_connection_id, store_id)
    REFERENCES public.store_courier_connections(id, store_id)
    ON DELETE SET NULL (courier_connection_id);

ALTER TABLE public.store_courier_credentials_secure
  DROP CONSTRAINT IF EXISTS store_courier_credentials_secure_connection_store_fkey,
  ADD CONSTRAINT store_courier_credentials_secure_connection_store_fkey
    FOREIGN KEY (connection_id, store_id)
    REFERENCES public.store_courier_connections(id, store_id)
    ON DELETE CASCADE;

ALTER TABLE public.store_cart_recovery_leads
  DROP CONSTRAINT IF EXISTS store_cart_recovery_leads_recovered_order_store_fkey,
  ADD CONSTRAINT store_cart_recovery_leads_recovered_order_store_fkey
    FOREIGN KEY (recovered_order_id, store_id)
    REFERENCES public.orders(id, store_id)
    ON DELETE SET NULL (recovered_order_id);

ALTER TABLE public.store_cart_recovery_messages
  DROP CONSTRAINT IF EXISTS store_cart_recovery_messages_lead_store_fkey,
  ADD CONSTRAINT store_cart_recovery_messages_lead_store_fkey
    FOREIGN KEY (lead_id, store_id)
    REFERENCES public.store_cart_recovery_leads(id, store_id)
    ON DELETE CASCADE;

ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS product_categories_parent_store_fkey,
  ADD CONSTRAINT product_categories_parent_store_fkey
    FOREIGN KEY (parent_id, store_id)
    REFERENCES public.product_categories(id, store_id)
    ON DELETE SET NULL (parent_id);

COMMENT ON CONSTRAINT order_shipments_courier_connection_store_fkey ON public.order_shipments IS
  'Shipment courier connections must belong to the shipment store.';
COMMENT ON CONSTRAINT store_courier_credentials_secure_connection_store_fkey ON public.store_courier_credentials_secure IS
  'Encrypted courier credentials cannot be attached to another store''s courier connection.';
COMMENT ON CONSTRAINT store_cart_recovery_leads_recovered_order_store_fkey ON public.store_cart_recovery_leads IS
  'Recovered orders must belong to the same store as the recovery lead.';
COMMENT ON CONSTRAINT store_cart_recovery_messages_lead_store_fkey ON public.store_cart_recovery_messages IS
  'Recovery messages must belong to a lead from the same store.';
COMMENT ON CONSTRAINT product_categories_parent_store_fkey ON public.product_categories IS
  'Category hierarchy cannot point to a parent from another store.';
