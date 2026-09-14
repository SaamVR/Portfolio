-- #314: one manual bKash transaction identity may back at most one SaaS invoice.
-- This migration intentionally fails closed when historical ambiguity exists.

DO $$
DECLARE
  v_blank_count integer;
  v_invalid_count integer;
  v_duplicate_groups integer;
  v_duplicate_paid_rows integer;
BEGIN
  SELECT count(*)
    INTO v_blank_count
  FROM public.store_invoices
  WHERE provider = 'bkash_manual'
    AND (provider_invoice_id IS NULL OR btrim(provider_invoice_id) = '');

  IF v_blank_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'manual_bkash_transaction_identity_missing',
      DETAIL = format('%s manual bKash invoice(s) have no transaction identity', v_blank_count),
      HINT = 'Reconcile these invoices before applying the replay-guard migration.';
  END IF;

  SELECT count(*)
    INTO v_invalid_count
  FROM public.store_invoices
  WHERE provider = 'bkash_manual'
    AND (
      char_length(btrim(provider_invoice_id)) > 128
      OR btrim(provider_invoice_id) !~ '^[A-Za-z0-9]+$'
    );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'manual_bkash_transaction_identity_invalid',
      DETAIL = format('%s manual bKash invoice(s) violate the alphanumeric transaction identity contract', v_invalid_count),
      HINT = 'Reconcile these invoice transaction identities before applying the replay-guard migration.';
  END IF;

  WITH duplicate_groups AS (
    SELECT upper(btrim(provider_invoice_id)) AS normalized_id
    FROM public.store_invoices
    WHERE provider = 'bkash_manual'
    GROUP BY upper(btrim(provider_invoice_id))
    HAVING count(*) > 1
  )
  SELECT count(*)
    INTO v_duplicate_groups
  FROM duplicate_groups;

  SELECT count(*)
    INTO v_duplicate_paid_rows
  FROM public.store_invoices AS invoice
  WHERE invoice.provider = 'bkash_manual'
    AND invoice.status = 'paid'
    AND upper(btrim(invoice.provider_invoice_id)) IN (
      SELECT upper(btrim(provider_invoice_id))
      FROM public.store_invoices
      WHERE provider = 'bkash_manual'
      GROUP BY upper(btrim(provider_invoice_id))
      HAVING count(*) > 1
    );

  IF v_duplicate_groups > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'manual_bkash_transaction_reconciliation_required',
      DETAIL = format(
        '%s duplicate normalized transaction group(s) exist; %s paid invoice row(s) are involved',
        v_duplicate_groups,
        v_duplicate_paid_rows
      ),
      HINT = 'Reconcile duplicate billing history explicitly, then rerun this migration. Do not auto-delete paid invoices.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_store_invoice_provider_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.provider = 'bkash_manual' AND NEW.provider_invoice_id IS NOT NULL THEN
    NEW.provider_invoice_id := upper(btrim(NEW.provider_invoice_id));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_store_invoice_provider_identity()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_store_invoice_provider_identity()
  TO postgres;

DROP TRIGGER IF EXISTS normalize_store_invoice_provider_identity_trigger
  ON public.store_invoices;
CREATE TRIGGER normalize_store_invoice_provider_identity_trigger
BEFORE INSERT OR UPDATE ON public.store_invoices
FOR EACH ROW
EXECUTE FUNCTION public.normalize_store_invoice_provider_identity();

UPDATE public.store_invoices
SET provider_invoice_id = upper(btrim(provider_invoice_id))
WHERE provider = 'bkash_manual'
  AND provider_invoice_id IS NOT NULL
  AND provider_invoice_id IS DISTINCT FROM upper(btrim(provider_invoice_id));

ALTER TABLE public.store_invoices
  DROP CONSTRAINT IF EXISTS store_invoices_bkash_manual_identity_required;
ALTER TABLE public.store_invoices
  ADD CONSTRAINT store_invoices_bkash_manual_identity_required
  CHECK (
    provider IS DISTINCT FROM 'bkash_manual'
    OR (
      payment_method = 'bkash_manual'
      AND provider_invoice_id IS NOT NULL
      AND btrim(provider_invoice_id) <> ''
      AND char_length(provider_invoice_id) <= 128
      AND provider_invoice_id ~ '^[A-Z0-9]+$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS store_invoices_bkash_manual_provider_transaction_uidx
  ON public.store_invoices (provider, upper(btrim(provider_invoice_id)))
  WHERE provider = 'bkash_manual'
    AND provider_invoice_id IS NOT NULL
    AND btrim(provider_invoice_id) <> '';

COMMENT ON INDEX public.store_invoices_bkash_manual_provider_transaction_uidx IS
  'Global manual bKash transaction identity: one normalized provider transaction may back at most one SaaS invoice.';
