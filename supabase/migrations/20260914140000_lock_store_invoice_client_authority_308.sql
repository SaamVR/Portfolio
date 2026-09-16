-- #308: merchant/browser roles may read governed billing records but may never
-- author SaaS settlement truth or entitlement-bearing invoice transitions.

DROP POLICY IF EXISTS "Store managers can create invoices" ON public.store_invoices;
DROP POLICY IF EXISTS "Store managers can update invoices" ON public.store_invoices;

REVOKE ALL PRIVILEGES ON TABLE public.store_invoices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.store_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_invoices TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_store_invoice_server_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_jwt_role text := auth.role();
BEGIN
  IF current_user IN ('anon', 'authenticated')
     OR v_jwt_role IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'store_invoice_server_authority_required';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_store_invoice_server_authority()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_store_invoice_server_authority()
  TO postgres;

DROP TRIGGER IF EXISTS enforce_store_invoice_server_authority_trigger
  ON public.store_invoices;
CREATE TRIGGER enforce_store_invoice_server_authority_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.store_invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_invoice_server_authority();

-- Keep the existing manager-scoped read policy. RLS still constrains SELECT to
-- stores the caller can manage while all mutation authority is server-only.

-- stores.plan remains a legacy entitlement fallback when no subscription row
-- exists. Browser roles may create a store only on the free default and may
-- never mutate that plan field after creation.
CREATE OR REPLACE FUNCTION public.enforce_store_plan_server_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_jwt_role text := auth.role();
  v_is_client boolean := current_user IN ('anon', 'authenticated')
    OR v_jwt_role IN ('anon', 'authenticated');
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

DROP TRIGGER IF EXISTS enforce_store_plan_server_authority_insert
  ON public.stores;
CREATE TRIGGER enforce_store_plan_server_authority_insert
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_plan_server_authority();

DROP TRIGGER IF EXISTS enforce_store_plan_server_authority_update
  ON public.stores;
CREATE TRIGGER enforce_store_plan_server_authority_update
BEFORE UPDATE OF plan ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_plan_server_authority();
