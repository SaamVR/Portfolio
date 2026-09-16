-- Return/refund operations are a manual recordkeeping surface until provider
-- refund/store-credit settlement authority exists. Keep the database truthful.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.store_return_requests
    WHERE refund_mode = 'store_credit'
  ) THEN
    RAISE EXCEPTION 'cannot disable store_credit while legacy rows still use it';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_return_requests
    WHERE (
      status = 'refunded'
      OR (status = 'completed' AND refund_mode IS NOT NULL)
    )
      AND NULLIF(BTRIM(COALESCE(internal_note, '')), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'resolved refund rows require external settlement evidence';
  END IF;
END;
$$;

ALTER TABLE public.store_return_requests
  DROP CONSTRAINT IF EXISTS store_return_requests_refund_mode_check;
ALTER TABLE public.store_return_requests
  ADD CONSTRAINT store_return_requests_refund_mode_check
  CHECK (
    refund_mode IS NULL
    OR refund_mode IN ('original_payment', 'cod_cash', 'manual_transfer')
  );

ALTER TABLE public.store_return_requests
  ADD CONSTRAINT store_return_requests_amount_nonnegative
  CHECK (
    COALESCE(requested_amount, 0) >= 0
    AND COALESCE(approved_amount, 0) >= 0
  );

ALTER TABLE public.store_return_requests
  ADD CONSTRAINT store_return_requests_settlement_evidence_check
  CHECK (
    NOT (
      status = 'refunded'
      OR (status = 'completed' AND refund_mode IS NOT NULL)
    )
    OR NULLIF(BTRIM(COALESCE(internal_note, '')), '') IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.enforce_return_amount_within_order_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _order_total bigint;
BEGIN
  SELECT GREATEST(COALESCE(total, 0), 0)::bigint
    INTO _order_total
  FROM public.orders
  WHERE id = NEW.order_id
    AND store_id = NEW.store_id;

  IF FOUND AND (
    COALESCE(NEW.requested_amount, 0) > _order_total
    OR COALESCE(NEW.approved_amount, 0) > _order_total
  ) THEN
    RAISE EXCEPTION 'return/refund amount exceeds authoritative order total';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_return_amount_within_order_total
  ON public.store_return_requests;
CREATE TRIGGER trg_enforce_return_amount_within_order_total
BEFORE INSERT OR UPDATE OF order_id, store_id, requested_amount, approved_amount
ON public.store_return_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_return_amount_within_order_total();
