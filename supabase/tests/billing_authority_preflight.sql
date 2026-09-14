\set ON_ERROR_STOP on

-- Read-only production gate for P0 #314 before billing migrations.
BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  v_duplicate_groups integer;
  v_missing_identity integer;
  v_invalid_identity integer;
  v_provider_method_mismatch integer;
BEGIN
  SELECT count(*) INTO v_duplicate_groups
  FROM (
    SELECT upper(btrim(provider_invoice_id))
    FROM public.store_invoices
    WHERE provider = 'bkash_manual'
    GROUP BY upper(btrim(provider_invoice_id))
    HAVING count(*) > 1
  ) AS duplicates;

  SELECT count(*) INTO v_provider_method_mismatch
  FROM public.store_invoices
  WHERE COALESCE(provider = 'bkash_manual', false) IS DISTINCT FROM COALESCE(payment_method = 'bkash_manual', false);

  SELECT count(*) INTO v_missing_identity
  FROM public.store_invoices
  WHERE (provider = 'bkash_manual' OR payment_method = 'bkash_manual')
    AND (provider_invoice_id IS NULL OR btrim(provider_invoice_id) = '');

  SELECT count(*) INTO v_invalid_identity
  FROM public.store_invoices
  WHERE (provider = 'bkash_manual' OR payment_method = 'bkash_manual')
    AND (
      char_length(btrim(provider_invoice_id)) > 128
      OR btrim(provider_invoice_id) !~ '^[A-Za-z0-9]+$'
    );

  IF v_duplicate_groups <> 0
     OR v_missing_identity <> 0
     OR v_invalid_identity <> 0
     OR v_provider_method_mismatch <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_authority_preflight_not_ready',
      DETAIL = format(
        'duplicate_groups=%s missing_identity=%s invalid_identity=%s provider_method_mismatch=%s',
        v_duplicate_groups, v_missing_identity, v_invalid_identity, v_provider_method_mismatch
      ),
      HINT = 'Complete finance-authoritative reconciliation before applying #314.';
  END IF;

  RAISE NOTICE 'billing authority preflight passed: no duplicate, missing, invalid, or provider/method-mismatched manual bKash identities';
END;
$$;

ROLLBACK;
