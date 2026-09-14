-- #323: make single-use invite consumption atomic with authority grant.
-- The Edge Function authenticates the caller; only service_role may execute this RPC.

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'co_admin',
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.invite_codes.email IS
  'Intended identity for privileged platform invites; new unused invites must be email-bound.';

ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS invite_codes_unused_requires_email;
ALTER TABLE public.invite_codes
  ADD CONSTRAINT invite_codes_unused_requires_email
  CHECK (used_by IS NOT NULL OR nullif(btrim(email), '') IS NOT NULL) NOT VALID;

CREATE OR REPLACE FUNCTION public.claim_invite_code_atomic(
  p_code text,
  p_user_id uuid,
  p_user_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_code text := btrim(coalesce(p_code, ''));
  v_email text := nullif(lower(btrim(coalesce(p_user_email, ''))), '');
  v_store_invite public.store_staff_invites%ROWTYPE;
  v_claimed_store public.store_staff_invites%ROWTYPE;
  v_platform_invite public.invite_codes%ROWTYPE;
  v_claimed_platform public.invite_codes%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023';
  END IF;

  IF v_code = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  SELECT *
    INTO v_store_invite
    FROM public.store_staff_invites
   WHERE invite_code = v_code
   FOR UPDATE;

  IF FOUND THEN
    IF v_store_invite.claimed_by IS NOT NULL OR v_store_invite.status = 'claimed' THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_used', 'membership_type', 'store');
    END IF;

    IF v_store_invite.status = 'revoked' THEN
      RETURN jsonb_build_object('success', false, 'error', 'revoked', 'membership_type', 'store');
    END IF;

    IF v_store_invite.status = 'expired'
       OR (v_store_invite.expires_at IS NOT NULL AND v_store_invite.expires_at <= now()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'expired', 'membership_type', 'store');
    END IF;

    IF v_store_invite.status <> 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_invite_state', 'membership_type', 'store');
    END IF;

    IF v_store_invite.email IS NOT NULL
       AND (v_email IS NULL OR lower(btrim(v_store_invite.email)) <> v_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'wrong_email', 'membership_type', 'store');
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_store_invite.store_id::text || ':' || p_user_id::text, 323)
    );

    IF EXISTS (
      SELECT 1
        FROM public.store_memberships
       WHERE store_id = v_store_invite.store_id
         AND user_id = p_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'existing_membership', 'membership_type', 'store');
    END IF;

    UPDATE public.store_staff_invites
       SET claimed_by = p_user_id,
           claimed_at = now(),
           status = 'claimed',
           updated_at = now()
     WHERE id = v_store_invite.id
       AND claimed_by IS NULL
       AND status = 'pending'
    RETURNING * INTO v_claimed_store;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_used', 'membership_type', 'store');
    END IF;

    INSERT INTO public.store_memberships (store_id, user_id, role, invited_by)
    VALUES (
      v_claimed_store.store_id,
      p_user_id,
      v_claimed_store.role,
      v_claimed_store.created_by
    );

    RETURN jsonb_build_object(
      'success', true,
      'membership_type', 'store',
      'role', v_claimed_store.role,
      'store_id', v_claimed_store.store_id
    );
  END IF;

  SELECT *
    INTO v_platform_invite
    FROM public.invite_codes
   WHERE code = v_code
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF v_platform_invite.used_by IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used', 'membership_type', 'platform');
  END IF;

  IF v_platform_invite.expires_at IS NOT NULL AND v_platform_invite.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'membership_type', 'platform');
  END IF;

  IF nullif(btrim(v_platform_invite.email), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'identity_binding_required', 'membership_type', 'platform');
  END IF;

  IF v_email IS NULL OR lower(btrim(v_platform_invite.email)) <> v_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_email', 'membership_type', 'platform');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 323)
  );

  IF EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'existing_role', 'membership_type', 'platform');
  END IF;

  UPDATE public.invite_codes
     SET used_by = p_user_id,
         used_at = now()
   WHERE id = v_platform_invite.id
     AND used_by IS NULL
  RETURNING * INTO v_claimed_platform;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used', 'membership_type', 'platform');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_claimed_platform.role);

  RETURN jsonb_build_object(
    'success', true,
    'membership_type', 'platform',
    'role', v_claimed_platform.role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_invite_code_atomic(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_invite_code_atomic(text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_invite_code_atomic(text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invite_code_atomic(text, uuid, text) TO service_role;

COMMENT ON FUNCTION public.claim_invite_code_atomic(text, uuid, text) IS
  'Atomically consumes one staff/platform invite and grants exactly one membership/role.';
