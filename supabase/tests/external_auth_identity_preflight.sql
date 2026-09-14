-- Read-only rollout preflight for P1 #334.
-- Existing users with legacy firebase_uid metadata require explicit reconciliation
-- before durable project+subject binding can become authority.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE nullif(raw_user_meta_data->>'firebase_uid', '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'external auth preflight failed: legacy Firebase-linked users require reconciliation';
  END IF;
END;
$$;
