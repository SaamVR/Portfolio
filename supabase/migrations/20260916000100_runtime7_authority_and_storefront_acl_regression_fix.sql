-- Runtime 7 composition fixes discovered by the full post-migration smoke pack.
-- Keep trusted server writes distinct from browser authority even when no JWT
-- role is present, and keep anonymous storefront reads independent of the
-- authenticated store-team helper.

CREATE OR REPLACE FUNCTION public.enforce_store_plan_server_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_jwt_role text := auth.role();
  v_is_client boolean := current_user IN ('anon', 'authenticated')
    OR coalesce(v_jwt_role IN ('anon', 'authenticated'), false);
BEGIN
  IF NOT v_is_client THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.plan IS DISTINCT FROM 'free' THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'store_plan_server_authority_required';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'store_plan_server_authority_required';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_store_plan_server_authority()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_store_plan_server_authority()
  TO postgres;

DROP POLICY IF EXISTS "Anyone can view published stores" ON public.stores;
DROP POLICY IF EXISTS "Authenticated store team can view stores" ON public.stores;

CREATE POLICY "Anyone can view published stores"
  ON public.stores FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Authenticated store team can view stores"
  ON public.stores FOR SELECT TO authenticated
  USING (public.can_view_store(id, (SELECT auth.uid())));

COMMENT ON FUNCTION public.enforce_store_plan_server_authority() IS
  'Prevents browser-authored stores.plan entitlement changes while allowing trusted server writes when no browser JWT role is present.';
