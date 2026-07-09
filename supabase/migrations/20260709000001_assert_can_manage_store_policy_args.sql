-- Regression guard for tenant RLS policy argument order.
-- can_manage_store is declared as can_manage_store(_store_id uuid, _user_id uuid).
-- If any live policy still calls can_manage_store(auth.uid(), ...), applying
-- migrations must fail loudly instead of leaving tenant access silently broken.

DO $$
DECLARE
  bad_policy text;
BEGIN
  SELECT format('%I.%I policy %I', schemaname, tablename, policyname)
    INTO bad_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual ~* 'can_manage_store\s*\(\s*auth\.uid\s*\('
      OR with_check ~* 'can_manage_store\s*\(\s*auth\.uid\s*\('
    )
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'Reversed can_manage_store arguments found in %', bad_policy;
  END IF;
END;
$$;
