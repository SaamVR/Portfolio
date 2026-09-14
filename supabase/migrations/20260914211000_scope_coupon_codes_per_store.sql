-- Coupon identities belong to a merchant storefront, not the whole platform.
-- The original schema made coupon_codes.code globally unique, preventing two
-- unrelated stores from using ordinary codes such as SAVE10.

DO $$
DECLARE
  _duplicate record;
BEGIN
  SELECT store_id, upper(trim(code)) AS normalized_code, count(*) AS duplicate_count
    INTO _duplicate
  FROM public.coupon_codes
  GROUP BY store_id, upper(trim(code))
  HAVING count(*) > 1
  ORDER BY count(*) DESC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'cannot scope coupon uniqueness: store % has duplicate normalized coupon code % (% rows)',
      coalesce(_duplicate.store_id::text, '<global>'),
      _duplicate.normalized_code,
      _duplicate.duplicate_count;
  END IF;
END;
$$;

-- Canonicalize existing data before replacing the uniqueness invariant.
UPDATE public.coupon_codes
SET code = upper(trim(code))
WHERE code IS DISTINCT FROM upper(trim(code));

CREATE OR REPLACE FUNCTION public.normalize_store_coupon_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(trim(coalesce(NEW.code, '')));
  IF NEW.code = '' THEN
    RAISE EXCEPTION 'coupon code is required' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_store_coupon_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_normalize_store_coupon_code ON public.coupon_codes;
CREATE TRIGGER trg_normalize_store_coupon_code
BEFORE INSERT OR UPDATE OF code ON public.coupon_codes
FOR EACH ROW
EXECUTE FUNCTION public.normalize_store_coupon_code();

-- Preserve uniqueness before removing the original global constraint. The
-- store-scoped index is the commerce invariant; the partial global index only
-- protects any legacy rows that intentionally have no store_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_codes_store_code_unique
  ON public.coupon_codes(store_id, code)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_codes_global_code_unique
  ON public.coupon_codes(code)
  WHERE store_id IS NULL;

ALTER TABLE public.coupon_codes
  DROP CONSTRAINT IF EXISTS coupon_codes_code_key;

COMMENT ON INDEX public.idx_coupon_codes_store_code_unique IS
  'Allows different stores to reuse the same coupon text while keeping each store coupon identity unique.';
