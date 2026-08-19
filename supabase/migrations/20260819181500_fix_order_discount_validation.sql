CREATE OR REPLACE FUNCTION public.create_store_order_with_stock(
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
  total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing record;
  _line record;
  _product record;
  _coupon public.coupon_codes%rowtype;
  _payment_settings jsonb := '{}'::jsonb;
  _discount_type text := 'none';
  _discount_value numeric := 0;
  _normalized_items jsonb := '[]'::jsonb;
  _subtotal integer := 0;
  _safe_delivery_fee integer := greatest(coalesce(_delivery_fee, 0), 0);
  _coupon_discount integer := 0;
  _prepaid_discount integer := 0;
  _safe_discount integer := 0;
  _requested_discount integer := greatest(coalesce(_discount_amount, 0), 0);
  _order public.orders%rowtype;
BEGIN
  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required' USING ERRCODE = '22023';
  END IF;

  IF nullif(trim(coalesce(_client_request_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'client_request_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT o.id, o.order_number, o.subtotal, o.delivery_fee, o.total
    INTO _existing
  FROM public.orders o
  WHERE o.store_id = _store_id
    AND o.client_request_id = _client_request_id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT _existing.id, _existing.order_number, _existing.subtotal, _existing.delivery_fee, _existing.total;
    RETURN;
  END IF;

  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'items must be a non-empty array' USING ERRCODE = '22023';
  END IF;

  FOR _line IN
    WITH parsed AS (
      SELECT
        (item.value->>'productId')::uuid AS product_id,
        coalesce(nullif(trim(item.value->>'size'), ''), 'Free Size') AS size,
        (item.value->>'quantity')::integer AS quantity
      FROM jsonb_array_elements(_items) AS item(value)
    )
    SELECT product_id, size, sum(quantity)::integer AS quantity
    FROM parsed
    GROUP BY product_id, size
  LOOP
    IF _line.quantity IS NULL OR _line.quantity < 1 OR _line.quantity > 99 THEN
      RAISE EXCEPTION 'invalid quantity' USING ERRCODE = '22023';
    END IF;

    SELECT p.id, p.name, p.price, p.image_url, p.stock, p.is_available
      INTO _product
    FROM public.products p
    WHERE p.id = _line.product_id
      AND p.store_id = _store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product not found' USING ERRCODE = '22023';
    END IF;

    IF NOT coalesce(_product.is_available, false) OR _product.stock < _line.quantity THEN
      RAISE EXCEPTION 'insufficient stock for %', _product.name USING ERRCODE = '22023';
    END IF;

    UPDATE public.products
    SET stock = stock - _line.quantity,
        is_available = CASE WHEN stock - _line.quantity <= 0 THEN false ELSE is_available END,
        updated_at = now()
    WHERE public.products.id = _product.id
      AND public.products.store_id = _store_id
      AND public.products.stock >= _line.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient stock for %', _product.name USING ERRCODE = '22023';
    END IF;

    _subtotal := _subtotal + (_product.price * _line.quantity);
    _normalized_items := _normalized_items || jsonb_build_array(jsonb_build_object(
      'productId', _product.id,
      'name', _product.name,
      'price', _product.price,
      'image', _product.image_url,
      'size', _line.size,
      'quantity', _line.quantity
    ));
  END LOOP;

  IF nullif(trim(coalesce(_coupon_code, '')), '') IS NOT NULL THEN
    SELECT *
      INTO _coupon
    FROM public.coupon_codes
    WHERE code = upper(trim(_coupon_code))
      AND is_active = true
      AND store_id = _store_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid coupon code' USING ERRCODE = '22023';
    END IF;

    IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
      RAISE EXCEPTION 'coupon has expired' USING ERRCODE = '22023';
    END IF;

    IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
      RAISE EXCEPTION 'coupon usage limit reached' USING ERRCODE = '22023';
    END IF;

    IF _coupon.min_order > 0 AND _subtotal < _coupon.min_order THEN
      RAISE EXCEPTION 'minimum order not met for coupon' USING ERRCODE = '22023';
    END IF;

    IF _coupon.discount_type = 'percentage' THEN
      _coupon_discount := round((_subtotal * _coupon.discount_value) / 100.0)::integer;
    ELSE
      _coupon_discount := _coupon.discount_value;
    END IF;

    _coupon_discount := least(greatest(_coupon_discount, 0), _subtotal);

    UPDATE public.coupon_codes
    SET uses_count = uses_count + 1,
        updated_at = now()
    WHERE public.coupon_codes.id = _coupon.id;
  END IF;

  SELECT coalesce(s.value, '{}'::jsonb)
    INTO _payment_settings
  FROM public.site_settings s
  WHERE s.store_id = _store_id
    AND s.key = 'payment_settings'
  LIMIT 1;

  IF NOT FOUND THEN
    _payment_settings := '{}'::jsonb;
  END IF;

  IF trim(coalesce(_payment_method, '')) IN ('bkash', 'bkash_manual', 'nagad') THEN
    _discount_type := coalesce(nullif(trim(_payment_settings->>'prepayment_discount_type'), ''), 'none');

    BEGIN
      _discount_value := greatest(coalesce((_payment_settings->>'prepayment_discount_value')::numeric, 0), 0);
    EXCEPTION
      WHEN invalid_text_representation THEN
        _discount_value := 0;
    END;

    IF _discount_type = 'percentage' THEN
      _prepaid_discount := least(
        round((_subtotal * _discount_value) / 100.0)::integer,
        _subtotal
      );
    ELSIF _discount_type = 'fixed' THEN
      _prepaid_discount := least(round(_discount_value)::integer, _subtotal);
    END IF;
  END IF;

  _safe_discount := least(
    _subtotal,
    greatest(_coupon_discount, 0) + greatest(_prepaid_discount, 0)
  );

  IF _requested_discount <> _safe_discount THEN
    RAISE EXCEPTION 'checkout pricing changed; refresh checkout and try again' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.orders (
    store_id,
    client_request_id,
    user_id,
    items,
    subtotal,
    delivery_fee,
    total,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    shipping_city,
    payment_method,
    notes
  )
  VALUES (
    _store_id,
    _client_request_id,
    _user_id,
    _normalized_items,
    _subtotal,
    _safe_delivery_fee,
    greatest(_subtotal + _safe_delivery_fee - _safe_discount, 0),
    trim(_customer_name),
    trim(_customer_phone),
    nullif(trim(coalesce(_customer_email, '')), ''),
    trim(_shipping_address),
    trim(_shipping_city),
    trim(_payment_method),
    nullif(trim(coalesce(_notes, '')), '')
  )
  RETURNING * INTO _order;

  RETURN QUERY SELECT _order.id, _order.order_number, _order.subtotal, _order.delivery_fee, _order.total;
EXCEPTION
  WHEN unique_violation THEN
    SELECT o.id, o.order_number, o.subtotal, o.delivery_fee, o.total
      INTO _existing
    FROM public.orders o
    WHERE o.store_id = _store_id
      AND o.client_request_id = _client_request_id
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT _existing.id, _existing.order_number, _existing.subtotal, _existing.delivery_fee, _existing.total;
      RETURN;
    END IF;

    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_order_with_stock(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_order_with_stock(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) TO service_role;
