-- Perform the destructive store-deletion core as one transaction. The function
-- is intentionally service-role only; request authorization remains in the API.
CREATE OR REPLACE FUNCTION public.delete_store_transactional(
  p_store_id uuid,
  p_actor_id uuid,
  p_actor_email text,
  p_actor_role text,
  p_admin_note text,
  p_ban_merchant boolean,
  p_is_platform_admin boolean,
  p_created_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  owner_user_id uuid,
  deleted_all_owned_stores boolean,
  banned boolean,
  deleted_store_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_store public.stores%ROWTYPE;
  v_existing_can_create_store boolean;
  v_owner_can_create_store boolean;
  v_merchant_visible_reason text;
  v_remaining_count bigint;
BEGIN
  SELECT *
  INTO v_store
  FROM public.stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store % not found', p_store_id USING ERRCODE = 'P0002';
  END IF;

  IF p_is_platform_admin AND coalesce(btrim(p_admin_note), '') = '' THEN
    RAISE EXCEPTION 'Deletion note is required for platform admins' USING ERRCODE = '22023';
  END IF;

  IF v_store.owner_id IS NOT NULL THEN
    SELECT can_create_store
    INTO v_existing_can_create_store
    FROM public.merchant_account_statuses
    WHERE user_id = v_store.owner_id;
  END IF;

  v_owner_can_create_store := CASE
    WHEN p_ban_merchant THEN false
    ELSE coalesce(v_existing_can_create_store, true)
  END;

  v_merchant_visible_reason := CASE
    WHEN p_is_platform_admin THEN btrim(p_admin_note)
    ELSE coalesce(nullif(btrim(p_admin_note), ''), 'This site was removed from your workspace at your request.')
  END;

  INSERT INTO public.store_deletion_records (
    deleted_store_id,
    owner_user_id,
    store_name,
    store_slug,
    deletion_source,
    merchant_visible_reason,
    admin_note,
    deleted_by_user_id,
    owner_can_create_store,
    created_at
  )
  VALUES (
    v_store.id,
    v_store.owner_id,
    v_store.name,
    v_store.slug,
    CASE WHEN p_is_platform_admin THEN 'platform_admin_delete' ELSE 'merchant_self_delete' END,
    v_merchant_visible_reason,
    nullif(btrim(p_admin_note), ''),
    p_actor_id,
    v_owner_can_create_store,
    p_created_at
  );

  IF v_store.owner_id IS NOT NULL AND p_ban_merchant THEN
    INSERT INTO public.merchant_account_statuses (
      user_id,
      can_create_store,
      status_note,
      banned_at,
      restored_at,
      updated_by,
      updated_at
    )
    VALUES (
      v_store.owner_id,
      false,
      coalesce(nullif(btrim(p_admin_note), ''), 'Store access was restricted by the platform team.'),
      p_created_at,
      NULL,
      p_actor_id,
      p_created_at
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      can_create_store = false,
      status_note = EXCLUDED.status_note,
      banned_at = EXCLUDED.banned_at,
      restored_at = NULL,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;
  END IF;

  DELETE FROM public.stores
  WHERE id = v_store.id;

  INSERT INTO public.platform_audit_logs (
    actor_id,
    actor_email,
    actor_role,
    action,
    target_type,
    target_id,
    details,
    created_at
  )
  VALUES (
    p_actor_id,
    p_actor_email,
    coalesce(nullif(p_actor_role, ''), 'store_owner'),
    'delete_store',
    'store',
    v_store.id::text,
    jsonb_build_object(
      'store_name', v_store.name,
      'store_slug', v_store.slug,
      'owner_id', v_store.owner_id,
      'banned_merchant', p_ban_merchant,
      'admin_note', nullif(btrim(p_admin_note), ''),
      'deletion_source', CASE WHEN p_is_platform_admin THEN 'platform_admin_delete' ELSE 'merchant_self_delete' END
    ),
    p_created_at
  );

  IF v_store.owner_id IS NULL THEN
    v_remaining_count := 0;
  ELSE
    SELECT count(*)
    INTO v_remaining_count
    FROM public.stores
    WHERE owner_id = v_store.owner_id;
  END IF;

  RETURN QUERY SELECT
    v_store.owner_id,
    v_store.owner_id IS NOT NULL AND v_remaining_count = 0,
    p_ban_merchant,
    v_store.id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_store_transactional(uuid, uuid, text, text, text, boolean, boolean, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_store_transactional(uuid, uuid, text, text, text, boolean, boolean, timestamptz)
  TO service_role;
