-- P0 release blocker: authoritative order creation (#309, #310, #318).
--
-- Commercial option identity/pricing is stored with the merchant product, delivery
-- totals are derived from merchant delivery settings, and payment eligibility is
-- resolved by the server then rechecked transactionally before inventory moves.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS commercial_options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_fulfillment_type_check,
  ADD CONSTRAINT products_fulfillment_type_check
    CHECK (fulfillment_type IN ('physical', 'digital')),
  DROP CONSTRAINT IF EXISTS products_commercial_options_is_array,
  ADD CONSTRAINT products_commercial_options_is_array
    CHECK (jsonb_typeof(commercial_options) = 'array'),
  DROP CONSTRAINT IF EXISTS products_commercial_options_size_check,
  ADD CONSTRAINT products_commercial_options_size_check
    CHECK (octet_length(commercial_options::text) <= 65536);

CREATE OR REPLACE FUNCTION public.sync_product_commercial_options()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _metrics jsonb := CASE
    WHEN jsonb_typeof(coalesce(NEW.metric_values, '{}'::jsonb)) = 'object' THEN coalesce(NEW.metric_values, '{}'::jsonb)
    ELSE '{}'::jsonb
  END;
  _source jsonb := '{}'::jsonb;
  _normalized_type text := lower(trim(coalesce(NEW.type, '')));
  _candidate jsonb := CASE
    WHEN jsonb_typeof(coalesce(NEW.commercial_options, '[]'::jsonb)) = 'array' THEN coalesce(NEW.commercial_options, '[]'::jsonb)
    ELSE '[]'::jsonb
  END;
  _normalized jsonb := '[]'::jsonb;
  _candidate_entry jsonb;
  _candidate_group_key text;
  _metric record;
  _group record;
  _entry jsonb;
  _existing jsonb;
  _group_key text;
  _label text;
  _kind text;
  _id text;
  _price_delta bigint;
  _active boolean;
BEGIN
  -- Commercial groups are explicit product-level commerce data. Descriptive
  -- metric schema entries must not silently become mandatory checkout options.
  -- Preserve groups the merchant has explicitly configured when the underlying
  -- metric still exists on the product.
  FOR _candidate_entry IN SELECT value FROM jsonb_array_elements(_candidate)
  LOOP
    _candidate_group_key := regexp_replace(lower(trim(coalesce(_candidate_entry->>'group_key', _candidate_entry->>'groupKey', ''))), '[^a-z0-9]+', '_', 'g');
    _candidate_group_key := trim(both '_' from _candidate_group_key);
    IF _candidate_group_key <> ''
      AND _metrics ? _candidate_group_key
      AND jsonb_typeof(_metrics->_candidate_group_key) = 'array'
    THEN
      _source := _source || jsonb_build_object(_candidate_group_key, _metrics->_candidate_group_key);
    END IF;
  END LOOP;

  -- Legacy size/color remain first-class purchasable variants and are promoted
  -- to stable zero-delta identities automatically.
  IF _metrics ? 'size' AND jsonb_typeof(_metrics->'size') = 'array' THEN
    _source := _source || jsonb_build_object('size', _metrics->'size');
  ELSIF coalesce(array_length(NEW.sizes, 1), 0) > 0 THEN
    _source := _source || jsonb_build_object('size', to_jsonb(NEW.sizes));
  END IF;
  IF _metrics ? 'color' AND jsonb_typeof(_metrics->'color') = 'array' THEN
    _source := _source || jsonb_build_object('color', _metrics->'color');
  ELSIF coalesce(array_length(NEW.colors, 1), 0) > 0 THEN
    _source := _source || jsonb_build_object('color', to_jsonb(NEW.colors));
  END IF;

  -- Known subscription and digital commerce dimensions are safe to promote
  -- automatically; unrelated descriptive metrics (formats, compatibility,
  -- room facts, etc.) remain presentation-only unless explicitly opted in.
  FOR _metric IN SELECT key, value FROM jsonb_each(_metrics)
  LOOP
    _candidate_group_key := regexp_replace(lower(trim(_metric.key)), '[^a-z0-9]+', '_', 'g');
    _candidate_group_key := trim(both '_' from _candidate_group_key);
    IF jsonb_typeof(_metric.value) <> 'array' THEN
      CONTINUE;
    END IF;
    IF _normalized_type ~ '(digital|download|license|template|asset)'
      AND _candidate_group_key ~ '(^|_)(license|licence)(_type|_tier)?$'
    THEN
      _source := _source || jsonb_build_object(_candidate_group_key, _metric.value);
    ELSIF _normalized_type ~ '(subscription|membership|plan|account)'
      AND _candidate_group_key ~ '(^|_)(plan|account_type|duration|billing_period|term)$'
    THEN
      _source := _source || jsonb_build_object(_candidate_group_key, _metric.value);
    END IF;
  END LOOP;

  FOR _group IN
    SELECT key, value
    FROM jsonb_each(_source)
    WHERE jsonb_typeof(value) = 'array'
    ORDER BY key
  LOOP
    _group_key := regexp_replace(lower(trim(_group.key)), '[^a-z0-9]+', '_', 'g');
    _group_key := trim(both '_' from _group_key);
    IF _group_key = '' THEN
      CONTINUE;
    END IF;

    FOR _entry IN SELECT value FROM jsonb_array_elements(_group.value)
    LOOP
      IF jsonb_typeof(_entry) <> 'string' THEN
        CONTINUE;
      END IF;
      _label := trim(both '"' from _entry::text);
      _label := trim(_label);
      IF _label = '' THEN
        CONTINUE;
      END IF;

      SELECT option_value
        INTO _existing
      FROM jsonb_array_elements(_candidate) AS option_row(option_value)
      WHERE lower(trim(option_value->>'group_key')) = _group_key
        AND lower(trim(option_value->>'label')) = lower(_label)
      LIMIT 1;

      _id := nullif(trim(coalesce(_existing->>'id', '')), '');
      IF _id IS NULL THEN
        _id := gen_random_uuid()::text;
      END IF;

      BEGIN
        _price_delta := round(coalesce((_existing->>'price_delta')::numeric, 0));
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        _price_delta := 0;
      END;
      _price_delta := greatest(-2000000000::bigint, least(2000000000::bigint, _price_delta));

      _active := CASE
        WHEN _existing ? 'active' THEN coalesce((_existing->>'active')::boolean, true)
        ELSE true
      END;

      _kind := lower(trim(coalesce(_existing->>'kind', '')));
      IF _kind NOT IN ('variant', 'plan', 'duration', 'license') THEN
        _kind := CASE
          WHEN _group_key ~ '(^|_)(license|licence)(_type|_tier)?$' THEN 'license'
          WHEN _group_key ~ '(^|_)(duration|billing_period|term)$' THEN 'duration'
          WHEN _group_key ~ '(^|_)(plan|account_type)$' THEN 'plan'
          ELSE 'variant'
        END;
      END IF;

      _normalized := _normalized || jsonb_build_array(jsonb_build_object(
        'id', _id,
        'group_key', _group_key,
        'label', _label,
        'price_delta', _price_delta::integer,
        'kind', _kind,
        'active', _active
      ));
    END LOOP;
  END LOOP;

  NEW.commercial_options := _normalized;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_product_commercial_options_trigger ON public.products;
CREATE TRIGGER sync_product_commercial_options_trigger
BEFORE INSERT OR UPDATE OF sizes, colors, metric_values, commercial_options
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_commercial_options();

-- Preserve the storefront's pre-existing digital semantics for already-created
-- digital catalog types. Merchants can explicitly change fulfillment_type later.
UPDATE public.products
SET fulfillment_type = 'digital'
WHERE fulfillment_type = 'physical'
  AND lower(coalesce(type, '')) ~ '(digital|download|license|template|asset)';

-- Fire the normalizer once for the installed catalog so every configured option
-- gets a stable identity before the new checkout contract is used.
UPDATE public.products
SET commercial_options = commercial_options;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS option_ids text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_size_key;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_size_option_ids_idx
  ON public.cart_items(user_id, product_id, size, option_ids);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_zone text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_zone_check,
  ADD CONSTRAINT orders_delivery_zone_check
    CHECK (delivery_zone IS NULL OR delivery_zone IN ('primary', 'secondary', 'none'));

CREATE OR REPLACE FUNCTION public.create_store_order_authoritative_v3(
  _store_id uuid,
  _client_request_id text,
  _user_id uuid,
  _items jsonb,
  _delivery_zone text,
  _expected_delivery_fee integer,
  _expected_discount_amount integer,
  _customer_name text,
  _customer_phone text,
  _customer_email text,
  _shipping_address text,
  _shipping_city text,
  _payment_method text,
  _payment_method_authorized boolean,
  _payment_method_prepaid boolean,
  _payment_provider text,
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
  _line jsonb;
  _product record;
  _coupon public.coupon_codes%rowtype;
  _payment_settings jsonb := '{}'::jsonb;
  _delivery_settings jsonb := '{}'::jsonb;
  _discount_type text := 'none';
  _discount_value numeric := 0;
  _normalized_items jsonb := '[]'::jsonb;
  _requested_option_ids jsonb := '[]'::jsonb;
  _resolved_options jsonb := '[]'::jsonb;
  _requested_items_identity jsonb := '[]'::jsonb;
  _existing_items_identity jsonb := '[]'::jsonb;
  _subtotal bigint := 0;
  _unit_price bigint := 0;
  _option_delta bigint := 0;
  _quantity integer;
  _expected_unit_price bigint;
  _active_group_count integer := 0;
  _resolved_group_count integer := 0;
  _resolved_option_count integer := 0;
  _option_label text := '';
  _digital_only boolean := true;
  _delivery_enabled boolean := true;
  _primary_delivery_fee integer := 80;
  _secondary_delivery_fee integer := 150;
  _free_threshold integer := 2000;
  _safe_delivery_fee integer := 0;
  _normalized_delivery_zone text := lower(trim(coalesce(_delivery_zone, 'primary')));
  _coupon_discount integer := 0;
  _prepaid_discount integer := 0;
  _safe_discount integer := 0;
  _effective_prepaid boolean := false;
  _order public.orders%rowtype;
BEGIN
  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required' USING ERRCODE = '22023';
  END IF;
  IF nullif(trim(coalesce(_client_request_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'client_request_id is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_store_id::text || ':' || trim(_client_request_id), 0));

  SELECT o.* INTO _existing
  FROM public.orders o
  WHERE o.store_id = _store_id
    AND o.client_request_id = trim(_client_request_id)
  LIMIT 1;

  IF FOUND THEN
    IF _existing.status = 'cancelled' THEN
      RAISE EXCEPTION 'checkout recovery conflict: this checkout attempt was cancelled; start a new checkout' USING ERRCODE = 'P0001';
    END IF;
    IF lower(trim(coalesce(_existing.payment_method, ''))) IS DISTINCT FROM lower(trim(coalesce(_payment_method, ''))) THEN
      RAISE EXCEPTION 'checkout recovery conflict: payment method does not match the existing order' USING ERRCODE = 'P0001';
    END IF;
    IF _existing.user_id IS DISTINCT FROM _user_id
      OR trim(coalesce(_existing.customer_name, '')) IS DISTINCT FROM trim(coalesce(_customer_name, ''))
      OR trim(coalesce(_existing.customer_phone, '')) IS DISTINCT FROM trim(coalesce(_customer_phone, ''))
      OR coalesce(nullif(trim(coalesce(_existing.customer_email, '')), ''), '') IS DISTINCT FROM coalesce(nullif(trim(coalesce(_customer_email, '')), ''), '')
      OR trim(coalesce(_existing.shipping_address, '')) IS DISTINCT FROM trim(coalesce(_shipping_address, ''))
      OR trim(coalesce(_existing.shipping_city, '')) IS DISTINCT FROM trim(coalesce(_shipping_city, ''))
      OR coalesce(nullif(trim(coalesce(_existing.notes, '')), ''), '') IS DISTINCT FROM coalesce(nullif(trim(coalesce(_notes, '')), ''), '')
      OR coalesce(_existing.delivery_zone, 'primary') IS DISTINCT FROM (CASE WHEN _existing.delivery_zone = 'none' THEN 'none' ELSE _normalized_delivery_zone END)
    THEN
      RAISE EXCEPTION 'checkout recovery conflict: checkout payload does not match the existing order' USING ERRCODE = 'P0001';
    END IF;

    IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) = 0 THEN
      RAISE EXCEPTION 'items must be a non-empty array' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(jsonb_agg(identity_row ORDER BY identity_row::text), '[]'::jsonb)
      INTO _requested_items_identity
    FROM (
      SELECT jsonb_build_object(
        'productId', (item.value->>'productId')::uuid,
        'optionIds', coalesce((
          SELECT jsonb_agg(option_id ORDER BY option_id)
          FROM jsonb_array_elements_text(coalesce(item.value->'optionIds', '[]'::jsonb)) AS selected(option_id)
        ), '[]'::jsonb),
        'quantity', (item.value->>'quantity')::integer
      ) AS identity_row
      FROM jsonb_array_elements(_items) AS item(value)
    ) requested;

    SELECT coalesce(jsonb_agg(identity_row ORDER BY identity_row::text), '[]'::jsonb)
      INTO _existing_items_identity
    FROM (
      SELECT jsonb_build_object(
        'productId', (item.value->>'productId')::uuid,
        'optionIds', coalesce((
          SELECT jsonb_agg(option_id ORDER BY option_id)
          FROM jsonb_array_elements_text(coalesce(item.value->'optionIds', '[]'::jsonb)) AS selected(option_id)
        ), '[]'::jsonb),
        'quantity', (item.value->>'quantity')::integer
      ) AS identity_row
      FROM jsonb_array_elements(_existing.items) AS item(value)
    ) persisted;

    IF _requested_items_identity IS DISTINCT FROM _existing_items_identity THEN
      RAISE EXCEPTION 'checkout recovery conflict: checkout option identity does not match the existing order' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY SELECT
      _existing.id, _existing.order_number, _existing.subtotal, _existing.delivery_fee,
      _existing.total, _existing.payment_method, _existing.status, true;
    RETURN;
  END IF;

  -- Payment eligibility is checked before inventory, coupon usage, or discounts.
  IF coalesce(_payment_method_authorized, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'payment method is not enabled or connected for this store' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(s.value, '{}'::jsonb) INTO _payment_settings
  FROM public.site_settings s
  WHERE s.store_id = _store_id AND s.key = 'payment_settings'
  LIMIT 1;
  IF NOT FOUND THEN _payment_settings := '{}'::jsonb; END IF;

  IF lower(trim(coalesce(_payment_method, ''))) = 'cod' THEN
    IF coalesce((_payment_settings->>'cod_enabled')::boolean, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'payment method is disabled for this store' USING ERRCODE = '22023';
    END IF;
    _effective_prepaid := false;
  ELSIF lower(trim(coalesce(_payment_method, ''))) = 'bkash_manual' THEN
    IF coalesce((_payment_settings->>'bkash_enabled')::boolean, false) IS NOT TRUE
      OR nullif(trim(coalesce(_payment_settings->>'bkash_number', '')), '') IS NULL THEN
      RAISE EXCEPTION 'payment method is disabled or not configured for this store' USING ERRCODE = '22023';
    END IF;
    _effective_prepaid := true;
  ELSIF lower(trim(coalesce(_payment_method, ''))) = 'nagad' THEN
    IF coalesce((_payment_settings->>'nagad_enabled')::boolean, false) IS NOT TRUE
      OR nullif(trim(coalesce(_payment_settings->>'nagad_number', '')), '') IS NULL THEN
      RAISE EXCEPTION 'payment method is disabled or not configured for this store' USING ERRCODE = '22023';
    END IF;
    _effective_prepaid := true;
  ELSE
    IF nullif(trim(coalesce(_payment_provider, '')), '') IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.store_payment_connections_secure connection
        WHERE connection.store_id = _store_id
          AND connection.provider = trim(_payment_provider)
          AND connection.status = 'connected'
          AND connection.revoked_at IS NULL
      ) THEN
      RAISE EXCEPTION 'payment provider is not connected for this store' USING ERRCODE = '22023';
    END IF;
    _effective_prepaid := coalesce(_payment_method_prepaid, false);
  END IF;

  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'items must be a non-empty array' USING ERRCODE = '22023';
  END IF;

  FOR _line IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    _quantity := (_line->>'quantity')::integer;
    IF _quantity IS NULL OR _quantity < 1 OR _quantity > 99 THEN
      RAISE EXCEPTION 'invalid quantity' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(coalesce(_line->'optionIds', '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'invalid option identity' USING ERRCODE = '22023';
    END IF;

    SELECT p.id, p.name, p.price, p.image_url, p.stock, p.is_available,
           p.commercial_options, p.fulfillment_type
      INTO _product
    FROM public.products p
    WHERE p.id = (_line->>'productId')::uuid
      AND p.store_id = _store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product not found' USING ERRCODE = '22023';
    END IF;
    IF NOT coalesce(_product.is_available, false) OR _product.stock < _quantity THEN
      RAISE EXCEPTION 'insufficient stock for %', _product.name USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(jsonb_agg(option_id ORDER BY option_id), '[]'::jsonb)
      INTO _requested_option_ids
    FROM jsonb_array_elements_text(coalesce(_line->'optionIds', '[]'::jsonb)) AS selected(option_id);

    IF jsonb_array_length(_requested_option_ids) <> (
      SELECT count(DISTINCT option_id)
      FROM jsonb_array_elements_text(_requested_option_ids) AS selected(option_id)
    ) THEN
      RAISE EXCEPTION 'duplicate option identity' USING ERRCODE = '22023';
    END IF;

    SELECT count(DISTINCT option_value->>'group_key')::integer
      INTO _active_group_count
    FROM jsonb_array_elements(coalesce(_product.commercial_options, '[]'::jsonb)) AS option_row(option_value)
    WHERE coalesce((option_value->>'active')::boolean, true) = true;

    SELECT
      count(*)::integer,
      count(DISTINCT option_value->>'group_key')::integer,
      coalesce(sum((option_value->>'price_delta')::integer), 0)::bigint,
      coalesce(jsonb_agg(jsonb_build_object(
        'id', option_value->>'id',
        'groupKey', option_value->>'group_key',
        'label', option_value->>'label',
        'priceDelta', (option_value->>'price_delta')::integer,
        'kind', option_value->>'kind'
      ) ORDER BY option_value->>'group_key', option_value->>'id'), '[]'::jsonb),
      coalesce(string_agg(option_value->>'label', ' • ' ORDER BY option_value->>'group_key', option_value->>'id'), '')
      INTO _resolved_option_count, _resolved_group_count, _option_delta, _resolved_options, _option_label
    FROM jsonb_array_elements(coalesce(_product.commercial_options, '[]'::jsonb)) AS option_row(option_value)
    WHERE coalesce((option_value->>'active')::boolean, true) = true
      AND option_value->>'id' IN (
        SELECT option_id FROM jsonb_array_elements_text(_requested_option_ids) AS selected(option_id)
      );

    IF _resolved_option_count <> jsonb_array_length(_requested_option_ids) THEN
      RAISE EXCEPTION 'unknown or stale product option' USING ERRCODE = '22023';
    END IF;
    IF _resolved_group_count <> _resolved_option_count THEN
      RAISE EXCEPTION 'multiple options selected from the same option group' USING ERRCODE = '22023';
    END IF;
    IF _resolved_group_count <> _active_group_count THEN
      RAISE EXCEPTION 'product option selection is incomplete or stale' USING ERRCODE = '22023';
    END IF;

    _unit_price := _product.price::bigint + _option_delta;
    IF _unit_price < 0 OR _unit_price > 2000000000 THEN
      RAISE EXCEPTION 'authoritative option price is invalid' USING ERRCODE = '22023';
    END IF;

    IF _line ? 'expectedUnitPrice' AND _line->>'expectedUnitPrice' IS NOT NULL THEN
      _expected_unit_price := (_line->>'expectedUnitPrice')::bigint;
      IF _expected_unit_price IS DISTINCT FROM _unit_price THEN
        RAISE EXCEPTION 'checkout pricing changed; refresh checkout and try again' USING ERRCODE = '22023';
      END IF;
    END IF;

    UPDATE public.products
    SET stock = stock - _quantity,
        is_available = CASE WHEN stock - _quantity <= 0 THEN false ELSE is_available END,
        updated_at = now()
    WHERE public.products.id = _product.id
      AND public.products.store_id = _store_id
      AND public.products.stock >= _quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient stock for %', _product.name USING ERRCODE = '22023';
    END IF;

    _subtotal := _subtotal + (_unit_price * _quantity);
    IF _subtotal > 2000000000 THEN
      RAISE EXCEPTION 'order subtotal is too large' USING ERRCODE = '22023';
    END IF;
    IF coalesce(_product.fulfillment_type, 'physical') <> 'digital' THEN
      _digital_only := false;
    END IF;

    _normalized_items := _normalized_items || jsonb_build_array(jsonb_build_object(
      'productId', _product.id,
      'name', _product.name,
      'price', _unit_price::integer,
      'unitPrice', _unit_price::integer,
      'image', _product.image_url,
      'size', CASE WHEN _option_label <> '' THEN _option_label ELSE 'Default option' END,
      'optionIds', _requested_option_ids,
      'options', _resolved_options,
      'fulfillmentType', coalesce(_product.fulfillment_type, 'physical'),
      'quantity', _quantity
    ));
  END LOOP;

  IF nullif(trim(coalesce(_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO _coupon
    FROM public.coupon_codes
    WHERE code = upper(trim(_coupon_code))
      AND is_active = true
      AND store_id = _store_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'invalid coupon code' USING ERRCODE = '22023'; END IF;
    IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN RAISE EXCEPTION 'coupon has expired' USING ERRCODE = '22023'; END IF;
    IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN RAISE EXCEPTION 'coupon usage limit reached' USING ERRCODE = '22023'; END IF;
    IF _coupon.min_order > 0 AND _subtotal < _coupon.min_order THEN RAISE EXCEPTION 'minimum order not met for coupon' USING ERRCODE = '22023'; END IF;

    IF _coupon.discount_type = 'percentage' THEN
      _coupon_discount := round((_subtotal * _coupon.discount_value) / 100.0)::integer;
    ELSE
      _coupon_discount := _coupon.discount_value;
    END IF;
    _coupon_discount := least(greatest(_coupon_discount, 0), _subtotal::integer);

    UPDATE public.coupon_codes AS coupon SET uses_count = coupon.uses_count + 1, updated_at = now() WHERE coupon.id = _coupon.id;
  END IF;

  SELECT coalesce(s.value, '{}'::jsonb) INTO _delivery_settings
  FROM public.site_settings s
  WHERE s.store_id = _store_id AND s.key = 'delivery_settings'
  LIMIT 1;
  IF NOT FOUND THEN _delivery_settings := '{}'::jsonb; END IF;

  BEGIN
    _delivery_enabled := coalesce((_delivery_settings->>'enabled')::boolean, true);
  EXCEPTION WHEN invalid_text_representation THEN _delivery_enabled := true; END;
  BEGIN
    _primary_delivery_fee := greatest(coalesce((_delivery_settings->>'delivery_fee')::integer, 80), 0);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN _primary_delivery_fee := 80; END;
  BEGIN
    _secondary_delivery_fee := greatest(coalesce((_delivery_settings->>'delivery_fee_outside')::integer, 150), 0);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN _secondary_delivery_fee := 150; END;
  BEGIN
    _free_threshold := coalesce((_delivery_settings->>'free_threshold')::integer, 2000);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN _free_threshold := 2000; END;
  IF _free_threshold <= 0 THEN _free_threshold := 2000; END IF;

  IF _digital_only THEN
    _safe_delivery_fee := 0;
    _normalized_delivery_zone := 'none';
  ELSE
    IF _normalized_delivery_zone NOT IN ('primary', 'secondary') THEN
      RAISE EXCEPTION 'invalid delivery zone' USING ERRCODE = '22023';
    END IF;
    IF NOT _delivery_enabled OR _subtotal >= _free_threshold THEN
      _safe_delivery_fee := 0;
    ELSE
      _safe_delivery_fee := CASE WHEN _normalized_delivery_zone = 'secondary' THEN _secondary_delivery_fee ELSE _primary_delivery_fee END;
    END IF;
  END IF;

  _discount_type := CASE WHEN _effective_prepaid
    THEN coalesce(nullif(trim(_payment_settings->>'prepayment_discount_type'), ''), 'none')
    ELSE 'none'
  END;
  BEGIN
    _discount_value := greatest(coalesce((_payment_settings->>'prepayment_discount_value')::numeric, 0), 0);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN _discount_value := 0; END;

  IF _discount_type = 'percentage' THEN
    _prepaid_discount := least(round((_subtotal * _discount_value) / 100.0)::integer, _subtotal::integer);
  ELSIF _discount_type = 'fixed' THEN
    _prepaid_discount := least(round(_discount_value)::integer, _subtotal::integer);
  ELSIF _discount_type = 'free_delivery' THEN
    _safe_delivery_fee := 0;
  END IF;

  _safe_discount := least(_subtotal::integer, greatest(_coupon_discount, 0) + greatest(_prepaid_discount, 0));

  IF _expected_delivery_fee IS NOT NULL AND greatest(_expected_delivery_fee, 0) IS DISTINCT FROM _safe_delivery_fee THEN
    RAISE EXCEPTION 'checkout delivery pricing changed; refresh checkout and try again' USING ERRCODE = '22023';
  END IF;
  IF _expected_discount_amount IS NOT NULL AND greatest(_expected_discount_amount, 0) IS DISTINCT FROM _safe_discount THEN
    RAISE EXCEPTION 'checkout pricing changed; refresh checkout and try again' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.orders (
    store_id, client_request_id, user_id, items, subtotal, delivery_fee, delivery_zone, total,
    customer_name, customer_phone, customer_email, shipping_address, shipping_city,
    payment_method, notes
  ) VALUES (
    _store_id, trim(_client_request_id), _user_id, _normalized_items, _subtotal::integer,
    _safe_delivery_fee, _normalized_delivery_zone,
    greatest(_subtotal::integer + _safe_delivery_fee - _safe_discount, 0),
    trim(_customer_name), trim(_customer_phone), nullif(trim(coalesce(_customer_email, '')), ''),
    trim(_shipping_address), trim(_shipping_city), lower(trim(_payment_method)), nullif(trim(coalesce(_notes, '')), '')
  )
  RETURNING * INTO _order;

  RETURN QUERY SELECT
    _order.id, _order.order_number, _order.subtotal, _order.delivery_fee,
    _order.total, _order.payment_method, _order.status, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_order_authoritative_v3(
  uuid, text, uuid, jsonb, text, integer, integer, text, text, text, text, text,
  text, boolean, boolean, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_order_authoritative_v3(
  uuid, text, uuid, jsonb, text, integer, integer, text, text, text, text, text,
  text, boolean, boolean, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.create_store_order_authoritative_v3(
  uuid, text, uuid, jsonb, text, integer, integer, text, text, text, text, text,
  text, boolean, boolean, text, text, text
) IS 'Authoritative storefront checkout: resolves option price identity, derives delivery, validates payment authority before inventory/coupon commitment, and preserves idempotent replay.';
