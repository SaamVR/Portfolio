-- #323: make single-use invite consumption atomic with authority grant.
-- The Edge Function authenticates the caller; only service_role may execute this RPC.

DO $$
DECLARE
  v_pending_owner_invites integer;
BEGIN
  SELECT count(*)
    INTO v_pending_owner_invites
  FROM public.store_staff_invites
  WHERE status = 'pending'
    AND role = 'owner';

  IF v_pending_owner_invites > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'owner_staff_invite_reconciliation_required',
      DETAIL = format('%s pending staff invite(s) request owner authority', v_pending_owner_invites),
      HINT = 'Revoke or reissue pending owner invites as admin/editor/viewer before applying #323.';
  END IF;
END;
$$;


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


ALTER TABLE public.store_staff_invites
  DROP CONSTRAINT IF EXISTS store_staff_invites_pending_role_not_owner;
ALTER TABLE public.store_staff_invites
  ADD CONSTRAINT store_staff_invites_pending_role_not_owner
  CHECK (status <> 'pending' OR role <> 'owner');

CREATE OR REPLACE FUNCTION public.resolve_store_staff_seat_limit(p_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_legacy_plan_id text;
  v_subscription_id uuid;
  v_subscription_plan_id text;
  v_subscription_status text;
  v_trial_ends_at timestamptz;
  v_effective_plan_id text;
  v_staff_limit integer;
BEGIN
  SELECT store_row.plan,
         subscription.id,
         subscription.plan_id,
         subscription.status,
         subscription.trial_ends_at
    INTO v_legacy_plan_id,
         v_subscription_id,
         v_subscription_plan_id,
         v_subscription_status,
         v_trial_ends_at
    FROM public.stores AS store_row
    LEFT JOIN public.store_subscriptions AS subscription
      ON subscription.store_id = store_row.id
   WHERE store_row.id = p_store_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_subscription_id IS NOT NULL THEN
    IF v_subscription_status = 'active'
       OR (v_subscription_status = 'trialing' AND (v_trial_ends_at IS NULL OR v_trial_ends_at >= now()))
       OR (v_subscription_status NOT IN ('active', 'trialing', 'cancelled') AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at >= now()) THEN
      v_effective_plan_id := coalesce(v_subscription_plan_id, v_legacy_plan_id);
    ELSE
      v_effective_plan_id := NULL;
    END IF;
  ELSIF nullif(btrim(v_legacy_plan_id), '') IS NOT NULL AND v_legacy_plan_id <> 'free' THEN
    v_effective_plan_id := v_legacy_plan_id;
  ELSE
    v_effective_plan_id := NULL;
  END IF;

  IF v_effective_plan_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT CASE
           WHEN jsonb_typeof(plan.feature_flags -> 'staff') = 'number'
             THEN (plan.feature_flags ->> 'staff')::integer
           ELSE 0
         END
    INTO v_staff_limit
    FROM public.cms_plans AS plan
   WHERE plan.id = v_effective_plan_id;

  IF NOT FOUND OR v_staff_limit IS NULL THEN
    RETURN 0;
  END IF;

  IF v_staff_limit < 0 THEN
    RETURN -1;
  END IF;

  RETURN v_staff_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_store_staff_seat_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_store_staff_seat_limit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_store_membership_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_store_owner uuid;
  v_staff_limit integer;
  v_staff_in_use integer;
BEGIN
  SELECT owner_id
    INTO v_store_owner
    FROM public.stores
   WHERE id = NEW.store_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'owner' THEN
    IF v_store_owner IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'store_owner_membership_identity_required';
    END IF;
    RETURN NEW;
  END IF;

  -- Updating an already-counted non-owner seat inside the same store is seat-neutral.
  IF TG_OP = 'UPDATE' AND OLD.store_id = NEW.store_id AND OLD.role <> 'owner' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('staff-seat:' || NEW.store_id::text, 325)
  );

  v_staff_limit := public.resolve_store_staff_seat_limit(NEW.store_id);
  IF v_staff_limit < 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT count(*)::integer
      INTO v_staff_in_use
      FROM public.store_memberships
     WHERE store_id = NEW.store_id
       AND role <> 'owner'
       AND id <> OLD.id;
  ELSE
    SELECT count(*)::integer
      INTO v_staff_in_use
      FROM public.store_memberships
     WHERE store_id = NEW.store_id
       AND role <> 'owner';
  END IF;

  IF v_staff_in_use >= v_staff_limit THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'store_staff_seat_limit_reached',
      DETAIL = format('store=%s staff_in_use=%s staff_limit=%s', NEW.store_id, v_staff_in_use, v_staff_limit);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_store_membership_authority() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_store_membership_authority_trigger ON public.store_memberships;
CREATE TRIGGER enforce_store_membership_authority_trigger
BEFORE INSERT OR UPDATE OF store_id, user_id, role ON public.store_memberships
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_membership_authority();

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
  v_staff_limit integer;
  v_staff_in_use integer;
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

    IF v_store_invite.role = 'owner' THEN
      RETURN jsonb_build_object('success', false, 'error', 'owner_role_not_invitable', 'membership_type', 'store');
    END IF;

    IF v_store_invite.email IS NOT NULL
       AND (v_email IS NULL OR lower(btrim(v_store_invite.email)) <> v_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'wrong_email', 'membership_type', 'store');
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('staff-seat:' || v_store_invite.store_id::text, 325)
    );
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

    v_staff_limit := public.resolve_store_staff_seat_limit(v_store_invite.store_id);
    IF v_staff_limit >= 0 THEN
      SELECT count(*)::integer
        INTO v_staff_in_use
        FROM public.store_memberships
       WHERE store_id = v_store_invite.store_id
         AND role <> 'owner';

      IF v_staff_in_use >= v_staff_limit THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'staff_seat_limit_reached',
          'membership_type', 'store',
          'staff_in_use', v_staff_in_use,
          'staff_limit', v_staff_limit
        );
      END IF;
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
