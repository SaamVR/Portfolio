-- Storefront manual-payment replay guard.
--
-- Manual bKash/Nagad checkout currently stores the shopper-supplied TrxID in
-- orders.notes. Make that external settlement identity exactly-once without
-- changing the existing order RPC signature or provider execution lifecycle.

CREATE TABLE IF NOT EXISTS public.storefront_manual_payment_claims (
  provider text NOT NULL CHECK (provider IN ('bkash_manual', 'nagad')),
  normalized_reference text NOT NULL CHECK (
    normalized_reference = upper(normalized_reference)
    AND normalized_reference ~ '^[A-Z0-9_-]{4,50}$'
  ),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, normalized_reference),
  UNIQUE (order_id)
);

ALTER TABLE public.storefront_manual_payment_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.storefront_manual_payment_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.storefront_manual_payment_claims TO service_role;

-- Fail closed before backfilling if two historical orders already claim the
-- same provider transaction identity. This requires reconciliation instead of
-- silently blessing an ambiguous settlement history.
DO $$
DECLARE
  _duplicate record;
BEGIN
  SELECT provider, normalized_reference, count(*) AS claim_count
    INTO _duplicate
  FROM (
    SELECT
      lower(trim(o.payment_method)) AS provider,
      upper(substring(
        coalesce(o.notes, '')
        FROM '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})'
      )) AS normalized_reference
    FROM public.orders o
    WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
  ) extracted
  WHERE normalized_reference IS NOT NULL
  GROUP BY provider, normalized_reference
  HAVING count(*) > 1
  ORDER BY count(*) DESC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot enable storefront manual payment replay guard: existing duplicate provider/reference %/% (% orders)',
      _duplicate.provider,
      _duplicate.normalized_reference,
      _duplicate.claim_count;
  END IF;
END;
$$;

INSERT INTO public.storefront_manual_payment_claims (
  provider,
  normalized_reference,
  store_id,
  order_id
)
SELECT
  lower(trim(o.payment_method)) AS provider,
  upper(substring(
    coalesce(o.notes, '')
    FROM '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})'
  )) AS normalized_reference,
  o.store_id,
  o.id
FROM public.orders o
WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
  AND substring(
    coalesce(o.notes, '')
    FROM '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})'
  ) IS NOT NULL
ON CONFLICT (provider, normalized_reference) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_storefront_manual_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _provider text := lower(trim(coalesce(NEW.payment_method, '')));
  _reference text;
BEGIN
  IF _provider NOT IN ('bkash_manual', 'nagad') THEN
    RETURN NEW;
  END IF;

  _reference := upper(substring(
    coalesce(NEW.notes, '')
    FROM '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})'
  ));

  IF nullif(trim(coalesce(_reference, '')), '') IS NULL THEN
    RAISE EXCEPTION 'manual payment transaction id is required'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize the same external settlement identity across stores and checkout
  -- request keys. If the first transaction rolls back, the next claimant may
  -- proceed; if it commits, every later claimant fails deterministically.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('storefront-manual-payment:' || _provider || ':' || _reference, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.storefront_manual_payment_claims c
    WHERE c.provider = _provider
      AND c.normalized_reference = _reference
  ) THEN
    RAISE EXCEPTION 'invalid manual payment transaction id: already used'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.storefront_manual_payment_claims (
    provider,
    normalized_reference,
    store_id,
    order_id
  )
  VALUES (
    _provider,
    _reference,
    NEW.store_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_storefront_manual_payment_reference() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_claim_storefront_manual_payment_reference ON public.orders;
CREATE TRIGGER trg_claim_storefront_manual_payment_reference
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.claim_storefront_manual_payment_reference();

COMMENT ON TABLE public.storefront_manual_payment_claims IS
  'Exactly-once claims for shopper-supplied manual bKash/Nagad settlement identities. Provider + normalized reference is globally unique across storefronts.';
