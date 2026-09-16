-- Read-only post-migration smoke for P1 #334.
DO $$
DECLARE
  _rls_enabled boolean;
BEGIN
  SELECT relrowsecurity
    INTO _rls_enabled
    FROM pg_class
   WHERE oid = 'public.external_auth_identities'::regclass;

  IF _rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'external auth identity table must have RLS enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.external_auth_identities'::regclass
      AND conname = 'external_auth_identities_provider_subject_unique'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'external auth immutable subject uniqueness constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.external_auth_identities'::regclass
      AND conname = 'external_auth_identities_provider_user_unique'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'external auth provider/user uniqueness constraint is missing';
  END IF;

  IF has_table_privilege('anon', 'public.external_auth_identities', 'SELECT')
     OR has_table_privilege('anon', 'public.external_auth_identities', 'INSERT')
     OR has_table_privilege('authenticated', 'public.external_auth_identities', 'SELECT')
     OR has_table_privilege('authenticated', 'public.external_auth_identities', 'INSERT')
     OR has_table_privilege('authenticated', 'public.external_auth_identities', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.external_auth_identities', 'DELETE') THEN
    RAISE EXCEPTION 'external auth binding table is exposed to browser roles';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.external_auth_identities', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.external_auth_identities', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.external_auth_identities', 'UPDATE')
     OR NOT has_table_privilege('service_role', 'public.external_auth_identities', 'DELETE') THEN
    RAISE EXCEPTION 'service_role lacks external auth binding authority';
  END IF;
END;
$$;
