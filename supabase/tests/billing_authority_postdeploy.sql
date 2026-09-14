\set ON_ERROR_STOP on

-- Read-only production verification for P0 #308/#314 after deployment.
BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  v_anon_privileges integer;
  v_authenticated_nonselect integer;
  v_authenticated_select integer;
  v_service_role_dml integer;
  v_mutation_policies integer;
  v_select_policy integer;
  v_invoice_trigger integer;
  v_plan_triggers integer;
  v_unique_index integer;
  v_identity_constraint integer;
  v_duplicate_groups integer;
BEGIN
  SELECT (
    has_table_privilege('anon', 'public.store_invoices', 'SELECT')::int
    + has_table_privilege('anon', 'public.store_invoices', 'INSERT')::int
    + has_table_privilege('anon', 'public.store_invoices', 'UPDATE')::int
    + has_table_privilege('anon', 'public.store_invoices', 'DELETE')::int
    + has_table_privilege('anon', 'public.store_invoices', 'TRUNCATE')::int
    + has_table_privilege('anon', 'public.store_invoices', 'REFERENCES')::int
    + has_table_privilege('anon', 'public.store_invoices', 'TRIGGER')::int
  ) INTO v_anon_privileges;

  SELECT (
    has_table_privilege('authenticated', 'public.store_invoices', 'INSERT')::int
    + has_table_privilege('authenticated', 'public.store_invoices', 'UPDATE')::int
    + has_table_privilege('authenticated', 'public.store_invoices', 'DELETE')::int
    + has_table_privilege('authenticated', 'public.store_invoices', 'TRUNCATE')::int
    + has_table_privilege('authenticated', 'public.store_invoices', 'REFERENCES')::int
    + has_table_privilege('authenticated', 'public.store_invoices', 'TRIGGER')::int
  ) INTO v_authenticated_nonselect;

  SELECT has_table_privilege(
    'authenticated', 'public.store_invoices', 'SELECT'
  )::int INTO v_authenticated_select;

  SELECT count(*) INTO v_service_role_dml
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'store_invoices'
    AND grantee = 'service_role'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  SELECT count(*) INTO v_mutation_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'store_invoices'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  SELECT count(*) INTO v_select_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'store_invoices'
    AND policyname = 'Store managers can view invoices'
    AND cmd = 'SELECT';

  SELECT count(*) INTO v_invoice_trigger
  FROM pg_trigger
  WHERE tgrelid = 'public.store_invoices'::regclass
    AND tgname = 'enforce_store_invoice_server_authority_trigger'
    AND NOT tgisinternal;

  SELECT count(*) INTO v_plan_triggers
  FROM pg_trigger
  WHERE tgrelid = 'public.stores'::regclass
    AND tgname IN (
      'enforce_store_plan_server_authority_insert',
      'enforce_store_plan_server_authority_update'
    )
    AND NOT tgisinternal;

  SELECT count(*) INTO v_unique_index
  FROM pg_index AS i
  JOIN pg_class AS c ON c.oid = i.indexrelid
  WHERE i.indrelid = 'public.store_invoices'::regclass
    AND c.relname = 'store_invoices_bkash_manual_provider_transaction_uidx'
    AND i.indisunique
    AND i.indisvalid
    AND i.indisready;

  SELECT count(*) INTO v_identity_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.store_invoices'::regclass
    AND conname = 'store_invoices_bkash_manual_identity_required'
    AND contype = 'c'
    AND convalidated;

  SELECT count(*) INTO v_duplicate_groups
  FROM (
    SELECT upper(btrim(provider_invoice_id))
    FROM public.store_invoices
    WHERE provider = 'bkash_manual'
    GROUP BY upper(btrim(provider_invoice_id))
    HAVING count(*) > 1
  ) AS duplicates;

  IF v_anon_privileges <> 0
     OR v_authenticated_nonselect <> 0
     OR v_authenticated_select <> 1
     OR v_service_role_dml <> 4
     OR v_mutation_policies <> 0
     OR v_select_policy <> 1
     OR v_invoice_trigger <> 1
     OR v_plan_triggers <> 2
     OR v_unique_index <> 1
     OR v_identity_constraint <> 1
     OR v_duplicate_groups <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_authority_postdeploy_verification_failed',
      DETAIL = format(
        'anon_privileges=%s auth_nonselect=%s auth_select=%s service_dml=%s mutation_policies=%s select_policy=%s invoice_trigger=%s plan_triggers=%s unique_index=%s identity_constraint=%s duplicate_groups=%s',
        v_anon_privileges, v_authenticated_nonselect, v_authenticated_select,
        v_service_role_dml, v_mutation_policies, v_select_policy,
        v_invoice_trigger, v_plan_triggers, v_unique_index,
        v_identity_constraint, v_duplicate_groups
      );
  END IF;

  RAISE NOTICE 'billing authority postdeploy verification passed';
END;
$$;

ROLLBACK;
