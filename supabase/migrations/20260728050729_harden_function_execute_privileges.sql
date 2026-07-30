-- Public-schema functions are API endpoints in Supabase. Start from a deny-by-
-- default posture, then grant only the routines used by browser clients or RLS.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- These helpers are referenced by public SELECT policies. They return false
-- for anonymous requests because auth.uid() is null, while authenticated calls
-- can only ask about the caller represented by the request JWT.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, _role::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.stores
        WHERE id = _store_id
          AND owner_id = _user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.store_memberships
        WHERE store_id = _store_id
          AND user_id = _user_id
          AND role IN ('owner', 'admin', 'editor')
      )
      OR public.has_role(_user_id, 'admin'::public.app_role)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1
        FROM public.stores
        WHERE id = _store_id
          AND owner_id = _user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.store_memberships
        WHERE store_id = _store_id
          AND user_id = _user_id
          AND role IN ('owner', 'admin')
      )
    );
$$;

-- Storefront visitors use these routines before authentication.
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_rate_limit(text) TO anon, authenticated;

-- RLS policies depend on these caller-bound authorization helpers.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid, uuid) TO authenticated;

-- Trusted server and Edge Function code retain access to every routine.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER FUNCTION public.check_store_lifecycles() SET search_path = public;
ALTER FUNCTION public.normalize_store_domain_hostname() SET search_path = public;
