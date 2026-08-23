-- Authoritative checkout recovery wrapper.
--
-- The legacy create_store_order_with_stock RPC remains intact for compatibility.
-- This v2 wrapper serializes each (store, client_request_id) attempt, rejects
-- payload/payment-method reuse that does not match the persisted order, and
-- tells the API whether the result is a fresh reservation or an idempotent replay.

CREATE OR REPLACE FUNCTION public.create_store_order_with_stock_v2(
  _store_id uuid,
  _client_request_id text,
  _user_id uuid,
  _items jsonb,
  _delivery_fee integer,
  _discount_amount integer,
  _customer_name text,
  _customer_phone text,
  _customer_email text,
  _shipping_address text,
  _shipping_city text,
  _payment_method text,
  _notes text,
  _coupon_code text
)
RETURNS TABLE (
  id uuid,
  order_number text,
  subtotal integer,
  delivery_fee integer,
  total integer,
  payment_method text,
  status text,
  replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.orders%rowtype;
  _created record;
  _requested_items_identity jsonb := '[]'::jsonb;
  _existing_items_identity jsonb := '[]'::jsonb;
BEGIN
  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required' USING ERRCODE = '22023';
  END IF;

  IF nullif(trim(coalesce(_client_request_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'client_request_id is required' USING ERRCODE = '22023';
  END IF;

  -- All v2 callers for the same storefront checkout attempt serialize here.
  -- This closes the race where two identical HTTP retries both miss a preflight
  -- read and would otherwise both treat the returned order as newly created.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(_store_id::text || ':' || trim(_client_request_id), 0)
  );

  SELECT o.*
    INTO _existing
  FROM public.orders o
  WHERE o.store_id = _store_id
    AND o.client_request_id = trim(_client_request_id)
  LIMIT 1;

  IF FOUND THEN
    IF _existing.status = 'cancelled' THEN
      RAISE EXCEPTION 'checkout recovery conflict: this checkout attempt was cancelled; start a new checkout'
        USING ERRCODE = 'P0001';
    END IF;

    IF lower(trim(coalesce(_existing.payment_method, ''))) IS DISTINCT FROM lower(trim(coalesce(_payment_method, ''))) THEN
      RAISE EXCEPTION 'checkout recovery conflict: payment method does not match the existing order'
        USING ERRCODE = 'P0001';
    END IF;

    IF _existing.user_id IS DISTINCT FROM _user_id
      OR trim(coalesce(_existing.customer_name, '')) IS DISTINCT FROM trim(coalesce(_customer_name, ''))
      OR trim(coalesce(_existing.customer_phone, '')) IS DISTINCT FROM trim(coalesce(_customer_phone, ''))
      OR coalesce(nullif(trim(coalesce(_existing.customer_email, '')), ''), '') IS DISTINCT FROM coalesce(nullif(trim(coalesce(_customer_email, '')), ''), '')
      OR trim(coalesce(_existing.shipping_address, '')) IS DISTINCT FROM trim(coalesce(_shipping_address, ''))
      OR trim(coalesce(_existing.shipping_city, '')) IS DISTINCT FROM trim(coalesce(_shipping_city, ''))
      OR coalesce(nullif(trim(coalesce(_existing.notes, '')), ''), '') IS DISTINCT FROM coalesce(nullif(trim(coalesce(_notes, '')), ''), '')
      OR greatest(coalesce(_existing.delivery_fee, 0), 0) IS DISTINCT FROM greatest(coalesce(_delivery_fee, 0), 0)
    THEN
      RAISE EXCEPTION 'checkout recovery conflict: checkout payload does not match the existing order'
        USING ERRCODE = 'P0001';
    END IF;

    IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) = 0 THEN
      RAISE EXCEPTION 'items must be a non-empty array' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'productId', requested.product_id,
          'size', requested.size,
          'quantity', requested.quantity
        )
        ORDER BY requested.product_id::text, requested.size
      ),
      '[]'::jsonb
    )
      INTO _requested_items_identity
    FROM (
      SELECT
        (item.value->>'productId')::uuid AS product_id,
        coalesce(nullif(trim(item.value->>'size'), ''), 'Free Size') AS size,
        sum((item.value->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(_items) AS item(value)
      GROUP BY 1, 2
    ) requested;

    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'productId', persisted.product_id,
          'size', persisted.size,
          'quantity', persisted.quantity
        )
        ORDER BY persisted.product_id::text, persisted.size
      ),
      '[]'::jsonb
    )
      INTO _existing_items_identity
    FROM (
      SELECT
        (item.value->>'productId')::uuid AS product_id,
        coalesce(nullif(trim(item.value->>'size'), ''), 'Free Size') AS size,
        sum((item.value->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(_existing.items) AS item(value)
      GROUP BY 1, 2
    ) persisted;

    -- Do not compare the browser _discount_amount with the persisted effective
    -- discount here. The canonical create_store_order_with_stock function is the
    -- pricing authority and recomputes discounts itself; the browser-provided
    -- value is not authoritative. Other checkout identity fields (including
    -- notes/coupon context) still fail closed when a request key is reused with
    -- a materially different checkout payload.
    IF _requested_items_identity IS DISTINCT FROM _existing_items_identity THEN
      RAISE EXCEPTION 'checkout recovery conflict: checkout payload does not match the existing order'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
      SELECT
        _existing.id,
        _existing.order_number,
        _existing.subtotal,
        _existing.delivery_fee,
        _existing.total,
        _existing.payment_method,
        _existing.status,
        true;
    RETURN;
  END IF;

  SELECT *
    INTO _created
  FROM public.create_store_order_with_stock(
    _store_id,
    trim(_client_request_id),
    _user_id,
    _items,
    _delivery_fee,
    _discount_amount,
    _customer_name,
    _customer_phone,
    _customer_email,
    _shipping_address,
    _shipping_city,
    _payment_method,
    _notes,
    _coupon_code
  );

  SELECT o.*
    INTO _existing
  FROM public.orders o
  WHERE o.id = _created.id
    AND o.store_id = _store_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'created order could not be reloaded' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT
      _existing.id,
      _existing.order_number,
      _existing.subtotal,
      _existing.delivery_fee,
      _existing.total,
      _existing.payment_method,
      _existing.status,
      false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_order_with_stock_v2(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_order_with_stock_v2(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.create_store_order_with_stock_v2(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) IS
  'Serializes storefront checkout attempts, rejects mismatched idempotent reuse, and marks replayed orders without reserving inventory twice.';
