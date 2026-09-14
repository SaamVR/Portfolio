-- P0 #317 + #327: authoritative redirect-payment reservation and execution lifecycle.
--
-- Invariants:
--   * COD/manual payment orders are accepted commerce orders and do not auto-expire.
--   * Automated bKash redirect orders reserve stock/coupon capacity for a finite lease.
--   * Cancellation/expiry releases stock and coupon capacity in the same transaction, once.
--   * A provider payment ID is durably bound to one store/order/provider attempt.
--   * Only the winner of claim_storefront_payment_execution may cross provider execute.
--   * Unknown provider outcomes become reconciliation_required and are never auto-released.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reservation_state text NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservation_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservation_release_reason text,
  ADD COLUMN IF NOT EXISTS reserved_coupon_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_reservation_state_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_reservation_state_check
      CHECK (reservation_state IN ('accepted', 'reserved', 'consumed', 'released', 'reconciliation_required'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_reserved_coupon_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_reserved_coupon_id_fkey
      FOREIGN KEY (reserved_coupon_id) REFERENCES public.coupon_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Existing non-redirect orders were already accepted operational orders. Existing
-- pending bKash rows (if any in another environment) are deliberately quarantined
-- instead of receiving a synthetic new expiry that could cancel an unknown payment.
UPDATE public.orders
SET reservation_state = CASE
      WHEN lower(trim(payment_method)) = 'bkash' AND status = 'pending'
        THEN 'reconciliation_required'
      WHEN status = 'cancelled'
        THEN 'released'
      ELSE 'accepted'
    END,
    reservation_released_at = CASE WHEN status = 'cancelled' THEN coalesce(reservation_released_at, updated_at, now()) ELSE reservation_released_at END,
    reservation_release_reason = CASE WHEN status = 'cancelled' THEN coalesce(reservation_release_reason, 'legacy_cancelled') ELSE reservation_release_reason END
WHERE reservation_state = 'accepted'
  AND reservation_expires_at IS NULL
  AND reservation_released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_reservation_expiry
  ON public.orders (reservation_expires_at)
  WHERE status = 'pending' AND reservation_state = 'reserved' AND reservation_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.storefront_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  provider text NOT NULL,
  state text NOT NULL DEFAULT 'creating'
    CHECK (state IN ('creating', 'created', 'executing', 'succeeded', 'failed', 'cancelled', 'expired', 'reconciliation_required')),
  amount integer NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'BDT',
  provider_payment_id text,
  provider_transaction_id text,
  checkout_url text,
  session_expires_at timestamptz NOT NULL,
  execute_claimed_at timestamptz,
  provider_completed_at timestamptz,
  reconciliation_reason text,
  last_provider_status text,
  provider_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_payment_attempts_order_store_fkey
    FOREIGN KEY (order_id, store_id) REFERENCES public.orders(id, store_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_payment_attempts_one_active
  ON public.storefront_payment_attempts (order_id, provider)
  WHERE state IN ('creating', 'created', 'executing', 'reconciliation_required');

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_payment_attempts_provider_payment
  ON public.storefront_payment_attempts (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_payment_attempts_provider_transaction
  ON public.storefront_payment_attempts (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_storefront_payment_attempts_expiry
  ON public.storefront_payment_attempts (session_expires_at)
  WHERE state IN ('creating', 'created');

ALTER TABLE public.storefront_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.storefront_payment_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.storefront_payment_attempts TO service_role;
GRANT ALL ON TABLE public.storefront_payment_attempts TO postgres;

DROP TRIGGER IF EXISTS update_storefront_payment_attempts_updated_at ON public.storefront_payment_attempts;
CREATE TRIGGER update_storefront_payment_attempts_updated_at
  BEFORE UPDATE ON public.storefront_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Replace cancellation restoration with one atomic inverse for every scarce
-- resource captured by order creation. Transition-to-cancelled is the exactly-once
-- guard; concurrent updates serialize on the order row.
CREATE OR REPLACE FUNCTION public.handle_order_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _line record;
BEGIN
  IF NEW.status = 'cancelled'
    AND OLD.status IS DISTINCT FROM 'cancelled'
    AND OLD.reservation_state IS DISTINCT FROM 'released'
    AND OLD.reservation_released_at IS NULL
  THEN
    IF EXISTS (
      SELECT 1
      FROM public.storefront_payment_attempts a
      WHERE a.order_id = OLD.id
        AND a.store_id = OLD.store_id
        AND a.state IN ('executing', 'reconciliation_required')
    ) THEN
      RAISE EXCEPTION 'cannot cancel order while payment execution outcome is unresolved'
        USING ERRCODE = 'P0001';
    END IF;

    IF jsonb_typeof(NEW.items) = 'array' THEN
      FOR _line IN
        SELECT
          (item.value->>'productId')::uuid AS product_id,
          sum((item.value->>'quantity')::integer)::integer AS quantity
        FROM jsonb_array_elements(NEW.items) AS item(value)
        WHERE nullif(item.value->>'productId', '') IS NOT NULL
        GROUP BY 1
      LOOP
        IF _line.product_id IS NOT NULL AND _line.quantity IS NOT NULL AND _line.quantity > 0 THEN
          UPDATE public.products
          SET stock = stock + _line.quantity,
              is_available = CASE WHEN stock + _line.quantity > 0 THEN true ELSE is_available END,
              updated_at = now()
          WHERE id = _line.product_id
            AND store_id = NEW.store_id;
        END IF;
      END LOOP;
    END IF;

    IF NEW.reserved_coupon_id IS NOT NULL THEN
      UPDATE public.coupon_codes
      SET uses_count = greatest(uses_count - 1, 0),
          updated_at = now()
      WHERE id = NEW.reserved_coupon_id
        AND store_id = NEW.store_id;
    END IF;

    NEW.reservation_state := 'released';
    NEW.reservation_expires_at := NULL;
    NEW.reservation_released_at := coalesce(NEW.reservation_released_at, now());
    NEW.reservation_release_reason := coalesce(nullif(trim(NEW.reservation_release_reason), ''), 'cancelled');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_order_cancellation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_order_cancellation() TO service_role;
GRANT ALL ON FUNCTION public.handle_order_cancellation() TO postgres;

DROP TRIGGER IF EXISTS trg_order_cancellation ON public.orders;
CREATE TRIGGER trg_order_cancellation
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION public.handle_order_cancellation();

COMMENT ON FUNCTION public.handle_order_cancellation() IS
  'Atomically releases reserved product stock and coupon capacity exactly once when an order transitions to cancelled.';

-- New wrapper: leave the canonical pricing/stock function and v2 idempotency
-- contract untouched so parallel order-authority work can compose underneath it.
CREATE OR REPLACE FUNCTION public.create_store_order_with_payment_lifecycle(
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
  replayed boolean,
  reservation_state text,
  reservation_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result record;
  _order public.orders%rowtype;
  _coupon_id uuid;
  _is_redirect_payment boolean := lower(trim(coalesce(_payment_method, ''))) = 'bkash';
BEGIN
  SELECT * INTO _result
  FROM public.create_store_order_with_stock_v2(
    _store_id,
    _client_request_id,
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

  SELECT o.* INTO _order
  FROM public.orders o
  WHERE o.id = _result.id AND o.store_id = _store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'created order could not be reloaded' USING ERRCODE = 'P0001';
  END IF;

  IF NOT coalesce(_result.replayed, false) THEN
    IF nullif(trim(coalesce(_coupon_code, '')), '') IS NOT NULL THEN
      SELECT c.id INTO _coupon_id
      FROM public.coupon_codes c
      WHERE c.store_id = _store_id
        AND c.code = upper(trim(_coupon_code))
      ORDER BY c.created_at DESC
      LIMIT 1;
    END IF;

    UPDATE public.orders o
    SET reserved_coupon_id = _coupon_id,
        reservation_state = CASE WHEN _is_redirect_payment THEN 'reserved' ELSE 'accepted' END,
        reservation_expires_at = CASE WHEN _is_redirect_payment THEN now() + interval '30 minutes' ELSE NULL END,
        reservation_released_at = NULL,
        reservation_release_reason = NULL
    WHERE o.id = _order.id
      AND o.store_id = _store_id
    RETURNING o.* INTO _order;
  ELSIF _order.reservation_state = 'reserved'
    AND _order.reservation_expires_at IS NOT NULL
    AND _order.reservation_expires_at <= now()
    AND _order.status = 'pending'
  THEN
    UPDATE public.storefront_payment_attempts a
    SET state = 'expired',
        reconciliation_reason = coalesce(a.reconciliation_reason, 'order_reservation_expired')
    WHERE a.order_id = _order.id
      AND a.store_id = _store_id
      AND a.state IN ('creating', 'created');

    -- Do not expire an obligation whose provider outcome is uncertain.
    IF NOT EXISTS (
      SELECT 1 FROM public.storefront_payment_attempts a
      WHERE a.order_id = _order.id
        AND a.store_id = _store_id
        AND a.state IN ('executing', 'reconciliation_required')
    ) THEN
      UPDATE public.orders o
      SET status = 'cancelled',
          reservation_release_reason = 'reservation_expired'
      WHERE o.id = _order.id
        AND o.status = 'pending'
      RETURNING o.* INTO _order;
    END IF;
  END IF;

  RETURN QUERY SELECT
    _order.id,
    _order.order_number,
    _order.subtotal,
    _order.delivery_fee,
    _order.total,
    _order.payment_method,
    _order.status,
    coalesce(_result.replayed, false),
    _order.reservation_state,
    _order.reservation_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_order_with_payment_lifecycle(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_order_with_payment_lifecycle(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) TO service_role;
GRANT ALL ON FUNCTION public.create_store_order_with_payment_lifecycle(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) TO postgres;

COMMENT ON FUNCTION public.create_store_order_with_payment_lifecycle(uuid, text, uuid, jsonb, integer, integer, text, text, text, text, text, text, text, text) IS
  'Wraps v2 idempotent order creation and atomically establishes finite bKash redirect reservation authority plus coupon identity.';

CREATE OR REPLACE FUNCTION public.prepare_storefront_payment_attempt(
  _store_id uuid,
  _order_number text,
  _provider text
)
RETURNS TABLE (
  attempt_id uuid,
  attempt_state text,
  claimed boolean,
  provider_payment_id text,
  checkout_url text,
  session_expires_at timestamptz,
  order_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders%rowtype;
  _attempt public.storefront_payment_attempts%rowtype;
  _provider_norm text := lower(trim(coalesce(_provider, '')));
BEGIN
  IF _provider_norm <> 'bkash' THEN
    RAISE EXCEPTION 'unsupported redirect payment provider' USING ERRCODE = '22023';
  END IF;

  SELECT o.* INTO _order
  FROM public.orders o
  WHERE o.store_id = _store_id
    AND o.order_number = trim(_order_number)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found for payment' USING ERRCODE = 'P0001';
  END IF;

  IF lower(trim(_order.payment_method)) <> _provider_norm THEN
    RAISE EXCEPTION 'order payment method does not match provider' USING ERRCODE = 'P0001';
  END IF;

  IF _order.status <> 'pending' THEN
    RAISE EXCEPTION 'order is no longer awaiting payment' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storefront_payment_attempts a
    WHERE a.order_id = _order.id
      AND a.store_id = _store_id
      AND a.provider = _provider_norm
      AND a.state = 'succeeded'
  ) THEN
    RAISE EXCEPTION 'payment obligation already succeeded' USING ERRCODE = 'P0001';
  END IF;

  IF _order.reservation_state = 'reconciliation_required' THEN
    SELECT a.* INTO _attempt
    FROM public.storefront_payment_attempts a
    WHERE a.order_id = _order.id
      AND a.provider = _provider_norm
      AND a.state = 'reconciliation_required'
    ORDER BY a.created_at DESC
    LIMIT 1
    FOR UPDATE;

    RETURN QUERY SELECT
      _attempt.id,
      'reconciliation_required'::text,
      false,
      _attempt.provider_payment_id,
      _attempt.checkout_url,
      _attempt.session_expires_at,
      _order.total;
    RETURN;
  END IF;

  IF _order.reservation_state <> 'reserved' THEN
    RAISE EXCEPTION 'order does not have an active redirect-payment reservation' USING ERRCODE = 'P0001';
  END IF;

  IF _order.reservation_expires_at IS NULL OR _order.reservation_expires_at <= now() THEN
    UPDATE public.storefront_payment_attempts a
    SET state = 'expired',
        reconciliation_reason = coalesce(a.reconciliation_reason, 'order_reservation_expired')
    WHERE a.order_id = _order.id
      AND a.state IN ('creating', 'created');

    IF NOT EXISTS (
      SELECT 1 FROM public.storefront_payment_attempts a
      WHERE a.order_id = _order.id
        AND a.state IN ('executing', 'reconciliation_required')
    ) THEN
      UPDATE public.orders
      SET status = 'cancelled',
          reservation_release_reason = 'reservation_expired'
      WHERE id = _order.id AND status = 'pending';
    END IF;

    RETURN QUERY SELECT NULL::uuid, 'order_expired'::text, false, NULL::text, NULL::text, NULL::timestamptz, _order.total;
    RETURN;
  END IF;

  SELECT a.* INTO _attempt
  FROM public.storefront_payment_attempts a
  WHERE a.order_id = _order.id
    AND a.provider = _provider_norm
    AND a.state IN ('creating', 'created', 'executing', 'reconciliation_required')
  ORDER BY a.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF _attempt.state = 'creating' AND _attempt.updated_at <= now() - interval '2 minutes' THEN
      UPDATE public.storefront_payment_attempts
      SET state = 'failed',
          reconciliation_reason = 'stale_create_claim'
      WHERE id = _attempt.id;
      _attempt.id := NULL;
    ELSIF _attempt.state = 'created' AND _attempt.session_expires_at <= now() THEN
      UPDATE public.storefront_payment_attempts
      SET state = 'expired',
          reconciliation_reason = coalesce(reconciliation_reason, 'provider_session_expired')
      WHERE id = _attempt.id;
      _attempt.id := NULL;
    ELSE
      RETURN QUERY SELECT
        _attempt.id,
        _attempt.state,
        false,
        _attempt.provider_payment_id,
        _attempt.checkout_url,
        _attempt.session_expires_at,
        _order.total;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.storefront_payment_attempts (
    store_id, order_id, provider, state, amount, currency, session_expires_at
  ) VALUES (
    _store_id,
    _order.id,
    _provider_norm,
    'creating',
    _order.total,
    'BDT',
    least(_order.reservation_expires_at, now() + interval '15 minutes')
  )
  RETURNING * INTO _attempt;

  RETURN QUERY SELECT
    _attempt.id,
    _attempt.state,
    true,
    _attempt.provider_payment_id,
    _attempt.checkout_url,
    _attempt.session_expires_at,
    _order.total;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_storefront_payment_creation(
  _attempt_id uuid,
  _reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _order_locked uuid;
BEGIN
  SELECT a.order_id INTO _order_id
  FROM public.storefront_payment_attempts a
  WHERE a.id = _attempt_id;
  IF _order_id IS NULL THEN RETURN false; END IF;

  SELECT o.id INTO _order_locked FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  PERFORM 1 FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  UPDATE public.storefront_payment_attempts
  SET state = 'failed',
      reconciliation_reason = left(coalesce(nullif(trim(_reason), ''), 'provider_create_failed'), 500)
  WHERE id = _attempt_id
    AND state = 'creating';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.bind_storefront_payment_attempt(
  _attempt_id uuid,
  _provider_payment_id text,
  _checkout_url text,
  _provider_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _order public.orders%rowtype;
  _attempt public.storefront_payment_attempts%rowtype;
  _duplicate uuid;
BEGIN
  IF nullif(trim(coalesce(_provider_payment_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'provider payment id is required' USING ERRCODE = '22023';
  END IF;
  IF nullif(trim(coalesce(_checkout_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'provider checkout url is required' USING ERRCODE = '22023';
  END IF;

  SELECT a.order_id INTO _order_id FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id;
  IF _order_id IS NULL THEN RETURN false; END IF;

  SELECT o.* INTO _order FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT a.* INTO _attempt FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    _attempt.provider || ':payment:' || trim(_provider_payment_id),
    0
  ));

  SELECT a.id INTO _duplicate
  FROM public.storefront_payment_attempts a
  WHERE a.provider = _attempt.provider
    AND a.provider_payment_id = trim(_provider_payment_id)
    AND a.id <> _attempt.id
  LIMIT 1;

  IF _duplicate IS NOT NULL THEN
    UPDATE public.storefront_payment_attempts
    SET state = 'failed',
        reconciliation_reason = 'duplicate_provider_payment_identity',
        provider_evidence = coalesce(_provider_evidence, '{}'::jsonb)
    WHERE id = _attempt.id
      AND state = 'creating';
    RETURN false;
  END IF;

  IF _attempt.state <> 'creating'
    OR _order.status <> 'pending'
    OR _order.reservation_state <> 'reserved'
    OR _order.reservation_expires_at IS NULL
    OR _order.reservation_expires_at <= now()
  THEN
    IF _attempt.state = 'creating' THEN
      UPDATE public.storefront_payment_attempts
      SET state = 'expired', reconciliation_reason = 'reservation_closed_before_provider_bind'
      WHERE id = _attempt_id;
    END IF;
    RETURN false;
  END IF;

  UPDATE public.storefront_payment_attempts
  SET state = 'created',
      provider_payment_id = trim(_provider_payment_id),
      checkout_url = trim(_checkout_url),
      provider_evidence = coalesce(_provider_evidence, '{}'::jsonb),
      last_provider_status = 'created'
  WHERE id = _attempt_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_storefront_payment_session(
  _store_id uuid,
  _order_number text,
  _provider text,
  _provider_payment_id text,
  _reason text
)
RETURNS TABLE (released boolean, attempt_state text, order_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt_id uuid;
  _order_id uuid;
  _attempt public.storefront_payment_attempts%rowtype;
  _order public.orders%rowtype;
  _terminal text;
BEGIN
  SELECT a.id, a.order_id INTO _attempt_id, _order_id
  FROM public.storefront_payment_attempts a
  JOIN public.orders o ON o.id = a.order_id AND o.store_id = a.store_id
  WHERE a.store_id = _store_id
    AND o.order_number = trim(_order_number)
    AND a.provider = lower(trim(_provider))
    AND a.provider_payment_id = trim(_provider_payment_id)
  LIMIT 1;

  IF _attempt_id IS NULL THEN
    RETURN QUERY SELECT false, 'unbound'::text, NULL::text;
    RETURN;
  END IF;

  SELECT o.* INTO _order FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT a.* INTO _attempt FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  IF _attempt.state <> 'created' OR _order.status <> 'pending' OR _order.reservation_state <> 'reserved' THEN
    RETURN QUERY SELECT false, _attempt.state, _order.status;
    RETURN;
  END IF;

  _terminal := CASE WHEN lower(trim(coalesce(_reason, ''))) LIKE '%cancel%' THEN 'cancelled' ELSE 'failed' END;

  UPDATE public.storefront_payment_attempts
  SET state = _terminal,
      reconciliation_reason = left(coalesce(nullif(trim(_reason), ''), 'provider_session_closed'), 500),
      last_provider_status = _terminal
  WHERE id = _attempt.id;

  UPDATE public.orders
  SET status = 'cancelled',
      reservation_release_reason = left(coalesce(nullif(trim(_reason), ''), 'provider_session_closed'), 500)
  WHERE id = _order.id
    AND status = 'pending'
    AND reservation_state = 'reserved';

  RETURN QUERY SELECT true, _terminal, 'cancelled'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_storefront_payment_execution(
  _store_id uuid,
  _order_number text,
  _provider text,
  _provider_payment_id text
)
RETURNS TABLE (
  attempt_id uuid,
  attempt_state text,
  claimed boolean,
  provider_transaction_id text,
  order_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt_id uuid;
  _order_id uuid;
  _attempt public.storefront_payment_attempts%rowtype;
  _order public.orders%rowtype;
BEGIN
  SELECT a.id, a.order_id INTO _attempt_id, _order_id
  FROM public.storefront_payment_attempts a
  JOIN public.orders o ON o.id = a.order_id AND o.store_id = a.store_id
  WHERE a.store_id = _store_id
    AND o.order_number = trim(_order_number)
    AND a.provider = lower(trim(_provider))
    AND a.provider_payment_id = trim(_provider_payment_id)
  LIMIT 1;

  IF _attempt_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'unbound'::text, false, NULL::text, trim(_order_number);
    RETURN;
  END IF;

  -- Every lifecycle RPC locks order first, attempt second to avoid lock inversion.
  SELECT o.* INTO _order FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT a.* INTO _attempt FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  IF _attempt.state = 'succeeded' THEN
    RETURN QUERY SELECT _attempt.id, _attempt.state, false, _attempt.provider_transaction_id, _order.order_number;
    RETURN;
  END IF;

  IF _attempt.state IN ('executing', 'reconciliation_required') THEN
    RETURN QUERY SELECT _attempt.id, _attempt.state, false, _attempt.provider_transaction_id, _order.order_number;
    RETURN;
  END IF;

  IF _attempt.state <> 'created' THEN
    RETURN QUERY SELECT _attempt.id, _attempt.state, false, _attempt.provider_transaction_id, _order.order_number;
    RETURN;
  END IF;

  IF _attempt.session_expires_at <= now() THEN
    UPDATE public.storefront_payment_attempts
    SET state = 'expired', reconciliation_reason = coalesce(reconciliation_reason, 'provider_session_expired')
    WHERE id = _attempt.id;

    RETURN QUERY SELECT _attempt.id, 'expired'::text, false, NULL::text, _order.order_number;
    RETURN;
  END IF;

  IF _order.status <> 'pending'
    OR _order.reservation_state <> 'reserved'
    OR _order.reservation_expires_at IS NULL
    OR _order.reservation_expires_at <= now()
  THEN
    UPDATE public.storefront_payment_attempts
    SET state = 'expired', reconciliation_reason = coalesce(reconciliation_reason, 'order_reservation_closed')
    WHERE id = _attempt.id;

    IF _order.status = 'pending'
      AND _order.reservation_state = 'reserved'
      AND _order.reservation_expires_at IS NOT NULL
      AND _order.reservation_expires_at <= now()
    THEN
      UPDATE public.orders
      SET status = 'cancelled', reservation_release_reason = 'reservation_expired'
      WHERE id = _order.id AND status = 'pending';
    END IF;

    RETURN QUERY SELECT _attempt.id, 'expired'::text, false, NULL::text, _order.order_number;
    RETURN;
  END IF;

  UPDATE public.storefront_payment_attempts
  SET state = 'executing',
      execute_claimed_at = now(),
      reconciliation_reason = NULL
  WHERE id = _attempt.id;

  RETURN QUERY SELECT _attempt.id, 'executing'::text, true, NULL::text, _order.order_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_storefront_payment_reconciliation_required(
  _attempt_id uuid,
  _reason text,
  _provider_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _order_locked uuid;
  _attempt public.storefront_payment_attempts%rowtype;
BEGIN
  SELECT a.order_id INTO _order_id FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id;
  IF _order_id IS NULL THEN RETURN false; END IF;

  SELECT o.id INTO _order_locked FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT a.* INTO _attempt FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  IF _attempt.state = 'succeeded' THEN RETURN true; END IF;
  IF _attempt.state NOT IN ('executing', 'reconciliation_required') THEN RETURN false; END IF;

  UPDATE public.storefront_payment_attempts
  SET state = 'reconciliation_required',
      reconciliation_reason = left(coalesce(nullif(trim(_reason), ''), 'provider_outcome_unknown'), 500),
      provider_evidence = coalesce(_provider_evidence, '{}'::jsonb)
  WHERE id = _attempt_id;

  UPDATE public.orders
  SET reservation_state = 'reconciliation_required',
      reservation_expires_at = NULL
  WHERE id = _order_id
    AND status = 'pending'
    AND reservation_state IN ('reserved', 'reconciliation_required');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_storefront_payment_execution(
  _attempt_id uuid,
  _reason text,
  _provider_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _order public.orders%rowtype;
  _attempt public.storefront_payment_attempts%rowtype;
BEGIN
  SELECT a.order_id INTO _order_id FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id;
  IF _order_id IS NULL THEN RETURN false; END IF;

  SELECT o.* INTO _order FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT a.* INTO _attempt FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  IF _attempt.state = 'succeeded' THEN RETURN false; END IF;
  IF _attempt.state NOT IN ('executing', 'reconciliation_required') THEN RETURN false; END IF;

  UPDATE public.storefront_payment_attempts
  SET state = 'failed',
      reconciliation_reason = left(coalesce(nullif(trim(_reason), ''), 'provider_final_failure'), 500),
      last_provider_status = 'failed',
      provider_evidence = coalesce(_provider_evidence, '{}'::jsonb)
  WHERE id = _attempt_id;

  IF _order.status = 'pending' AND _order.reservation_state IN ('reserved', 'reconciliation_required') THEN
    UPDATE public.orders
    SET status = 'cancelled',
        reservation_release_reason = left(coalesce(nullif(trim(_reason), ''), 'provider_final_failure'), 500)
    WHERE id = _order.id AND status = 'pending';
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_storefront_payment_success(
  _attempt_id uuid,
  _provider_payment_id text,
  _provider_transaction_id text,
  _provider_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (finalized boolean, attempt_state text, order_number text, provider_transaction_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _order public.orders%rowtype;
  _attempt public.storefront_payment_attempts%rowtype;
  _duplicate uuid;
  _trx text := trim(coalesce(_provider_transaction_id, ''));
BEGIN
  IF _trx = '' THEN
    RAISE EXCEPTION 'provider transaction id is required' USING ERRCODE = '22023';
  END IF;

  SELECT a.order_id INTO _order_id FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id;
  IF _order_id IS NULL THEN
    RETURN QUERY SELECT false, 'missing'::text, NULL::text, _trx;
    RETURN;
  END IF;

  SELECT o.* INTO _order FROM public.orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT a.* INTO _attempt FROM public.storefront_payment_attempts a WHERE a.id = _attempt_id FOR UPDATE;

  IF _attempt.provider_payment_id IS DISTINCT FROM trim(_provider_payment_id) THEN
    RAISE EXCEPTION 'provider payment id does not match authoritative attempt' USING ERRCODE = 'P0001';
  END IF;

  IF _attempt.state = 'succeeded' THEN
    RETURN QUERY SELECT
      _attempt.provider_transaction_id = _trx,
      _attempt.state,
      _order.order_number,
      _attempt.provider_transaction_id;
    RETURN;
  END IF;

  IF _attempt.state NOT IN ('executing', 'reconciliation_required') THEN
    RETURN QUERY SELECT false, _attempt.state, _order.order_number, _attempt.provider_transaction_id;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    _attempt.provider || ':transaction:' || _trx,
    0
  ));

  SELECT a.id INTO _duplicate
  FROM public.storefront_payment_attempts a
  WHERE a.provider = _attempt.provider
    AND a.provider_transaction_id = _trx
    AND a.id <> _attempt.id
  LIMIT 1;

  IF _duplicate IS NOT NULL THEN
    UPDATE public.storefront_payment_attempts
    SET state = 'reconciliation_required',
        provider_transaction_id = NULL,
        reconciliation_reason = 'duplicate_provider_transaction_identity',
        provider_evidence = coalesce(_provider_evidence, '{}'::jsonb)
    WHERE id = _attempt.id;

    UPDATE public.orders
    SET reservation_state = 'reconciliation_required', reservation_expires_at = NULL
    WHERE id = _order.id AND status = 'pending';

    RETURN QUERY SELECT false, 'reconciliation_required'::text, _order.order_number, _trx;
    RETURN;
  END IF;

  IF _order.status <> 'pending' OR _order.reservation_state NOT IN ('reserved', 'reconciliation_required') THEN
    UPDATE public.storefront_payment_attempts
    SET state = 'reconciliation_required',
        provider_transaction_id = _trx,
        provider_completed_at = now(),
        reconciliation_reason = 'provider_success_order_not_confirmable',
        provider_evidence = coalesce(_provider_evidence, '{}'::jsonb),
        last_provider_status = 'completed'
    WHERE id = _attempt.id;

    RETURN QUERY SELECT false, 'reconciliation_required'::text, _order.order_number, _trx;
    RETURN;
  END IF;

  UPDATE public.storefront_payment_attempts
  SET state = 'succeeded',
      provider_transaction_id = _trx,
      provider_completed_at = now(),
      reconciliation_reason = NULL,
      provider_evidence = coalesce(_provider_evidence, '{}'::jsonb),
      last_provider_status = 'completed'
  WHERE id = _attempt.id;

  UPDATE public.orders
  SET status = 'confirmed',
      reservation_state = 'consumed',
      reservation_expires_at = NULL,
      notes = CASE
        WHEN coalesce(notes, '') LIKE ('%Paid via bKash. TrxID: ' || _trx || '%') THEN notes
        WHEN nullif(trim(coalesce(notes, '')), '') IS NULL THEN 'Paid via bKash. TrxID: ' || _trx
        ELSE notes || ' | Paid via bKash. TrxID: ' || _trx
      END
  WHERE id = _order.id
    AND status = 'pending';

  RETURN QUERY SELECT true, 'succeeded'::text, _order.order_number, _trx;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_storefront_payment_reservations()
RETURNS TABLE (expired_orders integer, expired_attempts integer, reconciliation_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _candidate record;
  _attempt public.storefront_payment_attempts%rowtype;
  _locked_order uuid;
  _expired_orders integer := 0;
  _expired_attempts integer := 0;
  _reconciliation_attempts integer := 0;
  _changed integer := 0;
BEGIN
  -- If the worker died after acquiring the durable execute claim, never guess
  -- that no charge occurred. Quarantine it for provider query/reconciliation.
  FOR _candidate IN
    SELECT a.id AS attempt_id, a.order_id
    FROM public.storefront_payment_attempts a
    JOIN public.orders o ON o.id = a.order_id
    WHERE a.state = 'executing'
      AND a.execute_claimed_at IS NOT NULL
      AND a.execute_claimed_at <= now() - interval '2 minutes'
    ORDER BY a.order_id, a.id
  LOOP
    SELECT o.id INTO _locked_order
    FROM public.orders o
    WHERE o.id = _candidate.order_id
    FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT a.* INTO _attempt
    FROM public.storefront_payment_attempts a
    WHERE a.id = _candidate.attempt_id
    FOR UPDATE;

    IF _attempt.state = 'executing'
      AND _attempt.execute_claimed_at <= now() - interval '2 minutes'
    THEN
      UPDATE public.storefront_payment_attempts
      SET state = 'reconciliation_required',
          reconciliation_reason = coalesce(reconciliation_reason, 'stale_execute_claim')
      WHERE id = _attempt.id;

      UPDATE public.orders
      SET reservation_state = 'reconciliation_required',
          reservation_expires_at = NULL
      WHERE id = _candidate.order_id
        AND status = 'pending';

      _reconciliation_attempts := _reconciliation_attempts + 1;
    END IF;
  END LOOP;

  -- Expire provider sessions independently; the order lease may still allow a
  -- fresh session to be created without reserving stock/coupon again.
  FOR _candidate IN
    SELECT a.id AS attempt_id, a.order_id
    FROM public.storefront_payment_attempts a
    WHERE a.state IN ('creating', 'created')
      AND a.session_expires_at <= now()
    ORDER BY a.order_id, a.id
  LOOP
    SELECT o.id INTO _locked_order
    FROM public.orders o
    WHERE o.id = _candidate.order_id
    FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT a.* INTO _attempt
    FROM public.storefront_payment_attempts a
    WHERE a.id = _candidate.attempt_id
    FOR UPDATE;

    IF _attempt.state IN ('creating', 'created') AND _attempt.session_expires_at <= now() THEN
      UPDATE public.storefront_payment_attempts
      SET state = 'expired',
          reconciliation_reason = coalesce(reconciliation_reason, 'provider_session_expired')
      WHERE id = _attempt.id;
      _expired_attempts := _expired_attempts + 1;
    END IF;
  END LOOP;

  -- Release only known-safe expired reservations. Executing/unknown provider
  -- outcomes are intentionally excluded and remain quarantined for reconciliation.
  FOR _candidate IN
    SELECT o.id AS order_id
    FROM public.orders o
    WHERE o.status = 'pending'
      AND o.reservation_state = 'reserved'
      AND o.reservation_expires_at IS NOT NULL
      AND o.reservation_expires_at <= now()
    ORDER BY o.id
    FOR UPDATE SKIP LOCKED
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.storefront_payment_attempts a
      WHERE a.order_id = _candidate.order_id
        AND a.state IN ('executing', 'reconciliation_required')
    ) THEN
      CONTINUE;
    END IF;

    UPDATE public.storefront_payment_attempts
    SET state = 'expired',
        reconciliation_reason = coalesce(reconciliation_reason, 'order_reservation_expired')
    WHERE order_id = _candidate.order_id
      AND state IN ('creating', 'created');
    GET DIAGNOSTICS _changed = ROW_COUNT;
    _expired_attempts := _expired_attempts + _changed;

    UPDATE public.orders
    SET status = 'cancelled',
        reservation_release_reason = 'reservation_expired'
    WHERE id = _candidate.order_id
      AND status = 'pending'
      AND reservation_state = 'reserved';
    GET DIAGNOSTICS _changed = ROW_COUNT;
    _expired_orders := _expired_orders + _changed;
  END LOOP;

  RETURN QUERY SELECT _expired_orders, _expired_attempts, _reconciliation_attempts;
END;
$$;

-- Lifecycle RPCs are service/backend authority only.
DO $$
DECLARE
  _sig regprocedure;
BEGIN
  FOR _sig IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'prepare_storefront_payment_attempt',
        'fail_storefront_payment_creation',
        'bind_storefront_payment_attempt',
        'release_storefront_payment_session',
        'claim_storefront_payment_execution',
        'mark_storefront_payment_reconciliation_required',
        'fail_storefront_payment_execution',
        'finalize_storefront_payment_success',
        'expire_storefront_payment_reservations'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', _sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', _sig);
    EXECUTE format('GRANT ALL ON FUNCTION %s TO postgres', _sig);
  END LOOP;
END $$;

COMMENT ON TABLE public.storefront_payment_attempts IS
  'Authoritative storefront provider-payment attempts. Active-attempt uniqueness and execution claims prevent duplicate irreversible provider execution.';
COMMENT ON FUNCTION public.claim_storefront_payment_execution(uuid, text, text, text) IS
  'Atomically chooses the only claimant allowed to cross the irreversible payment-provider execute boundary.';
COMMENT ON FUNCTION public.finalize_storefront_payment_success(uuid, text, text, jsonb) IS
  'Atomically persists provider success and consumes the order reservation; never resurrects cancelled/released orders.';
COMMENT ON FUNCTION public.expire_storefront_payment_reservations() IS
  'Expires safe abandoned redirect-payment reservations while quarantining uncertain execute outcomes for reconciliation.';

-- One-minute bounded lease cleanup. This performs database-only safe expiry; it
-- never calls a payment provider and therefore never guesses unknown outcomes.
DO $$
DECLARE
  _job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    FOR _job_id IN
      SELECT jobid FROM cron.job WHERE jobname = 'storefront-payment-reservation-expiry'
    LOOP
      PERFORM cron.unschedule(_job_id);
    END LOOP;

    PERFORM cron.schedule(
      'storefront-payment-reservation-expiry',
      '* * * * *',
      'SELECT public.expire_storefront_payment_reservations()'
    );
  END IF;
END $$;
