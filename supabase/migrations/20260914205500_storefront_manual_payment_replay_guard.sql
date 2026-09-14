-- Storefront manual-payment replay guard.
--
-- Manual bKash/Nagad checkout currently stores the shopper-supplied TrxID in
-- orders.notes. Make that external settlement identity exactly-once without
-- changing the existing order RPC signature or provider execution lifecycle.

CREATE TABLE IF NOT EXISTS public.storefront_manual_payment_claims (
  provider text NOT NULL CHECK (provider IN ('bkash', 'nagad')),
  normalized_reference text NOT NULL CHECK (
    normalized_reference = upper(normalized_reference)
    AND normalized_reference ~ '^[A-Z0-9_-]{4,50}$'
  ),
  -- The settlement claim must survive store/order deletion so a consumed
  -- external transaction identity can never become reusable. Keep nullable
  -- references for diagnostics while the related records still exist.
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, normalized_reference),
  UNIQUE (order_id)
);

ALTER TABLE public.storefront_manual_payment_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.storefront_manual_payment_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.storefront_manual_payment_claims TO service_role;

-- Fail closed before backfilling if a historical manual-payment order does not
-- contain exactly one parseable TrxID, or if two orders claim the same external
-- settlement identity. Manual bKash uses canonical provider `bkash` so the
-- automated bKash path can share this identity namespace later.
DO $$
DECLARE
  _invalid record;
  _duplicate record;
BEGIN
  SELECT o.id AS order_id, parsed.match_count
    INTO _invalid
  FROM public.orders o
  CROSS JOIN LATERAL (
    SELECT count(*)::integer AS match_count
    FROM regexp_matches(
      coalesce(o.notes, ''),
      '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})',
      'g'
    ) AS m
  ) parsed
  WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
    AND parsed.match_count <> 1
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot enable storefront manual payment replay guard: manual order % has % parseable transaction references; exactly one is required',
      _invalid.order_id,
      _invalid.match_count;
  END IF;

  SELECT provider, normalized_reference, count(*) AS claim_count
    INTO _duplicate
  FROM (
    SELECT
      CASE lower(trim(o.payment_method))
        WHEN 'bkash_manual' THEN 'bkash'
        WHEN 'nagad' THEN 'nagad'
      END AS provider,
      parsed.normalized_reference
    FROM public.orders o
    CROSS JOIN LATERAL (
      SELECT min(upper(m[1])) AS normalized_reference
      FROM regexp_matches(
        coalesce(o.notes, ''),
        '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})',
        'g'
      ) AS m
    ) parsed
    WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
  ) extracted
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
  CASE lower(trim(o.payment_method))
    WHEN 'bkash_manual' THEN 'bkash'
    WHEN 'nagad' THEN 'nagad'
  END AS provider,
  parsed.normalized_reference,
  o.store_id,
  o.id
FROM public.orders o
CROSS JOIN LATERAL (
  SELECT
    count(*)::integer AS match_count,
    min(upper(m[1])) AS normalized_reference
  FROM regexp_matches(
    coalesce(o.notes, ''),
    '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})',
    'g'
  ) AS m
) parsed
WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
  AND parsed.match_count = 1
ON CONFLICT (provider, normalized_reference) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_storefront_manual_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment_method text := lower(trim(coalesce(NEW.payment_method, '')));
  _provider text;
  _reference text;
  _reference_count integer;
BEGIN
  IF _payment_method = 'bkash_manual' THEN
    _provider := 'bkash';
  ELSIF _payment_method = 'nagad' THEN
    _provider := 'nagad';
  ELSE
    RETURN NEW;
  END IF;

  SELECT
    count(*)::integer,
    min(upper(m[1]))
  INTO _reference_count, _reference
  FROM regexp_matches(
    coalesce(NEW.notes, ''),
    '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})',
    'g'
  ) AS m;

  IF _reference_count <> 1 OR nullif(trim(coalesce(_reference, '')), '') IS NULL THEN
    RAISE EXCEPTION 'exactly one manual payment transaction id is required'
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
  'Exactly-once claims for shopper-supplied manual bKash/Nagad settlement identities. Exactly one normalized TrxID is required per manual order; provider + reference is globally unique and remains consumed after store/order deletion.';
