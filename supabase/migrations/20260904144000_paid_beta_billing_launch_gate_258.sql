CREATE OR REPLACE FUNCTION public.is_paid_beta_billing_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT
      p.policy_version = '2026-09-04-paid-beta-1'
      AND p.binding = true
      AND p.effective_at IS NOT NULL
      AND now() >= p.effective_at
      AND NULLIF(btrim(p.site_name_snapshot), '') IS NOT NULL
      AND NULLIF(btrim(p.legal_operator_name_snapshot), '') IS NOT NULL
      AND j.country_enforcement_enabled = true
    FROM public.platform_policy_config AS p
    CROSS JOIN public.platform_jurisdiction_enforcement_config AS j
    WHERE p.singleton = true
      AND j.singleton = true
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_paid_beta_billing_ready()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_paid_beta_billing_ready()
  TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.assert_paid_beta_billing_ready()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_paid_beta_billing_ready() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'paid_beta_billing_unavailable';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_paid_beta_billing_ready()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_paid_beta_billing_ready()
  TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.enforce_invoice_platform_policy_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending' THEN
    PERFORM public.assert_paid_beta_billing_ready();
  END IF;

  SELECT owner_id
    INTO v_owner_id
  FROM public.stores
  WHERE id = NEW.store_id;

  PERFORM public.assert_current_platform_policy_accepted(v_owner_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_invoice_platform_policy_acceptance()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_invoice_platform_policy_acceptance()
  TO postgres;

CREATE OR REPLACE FUNCTION public.enforce_paid_beta_invoice_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF NEW.amount <= 0
     OR NEW.status IS DISTINCT FROM 'paid'
     OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  PERFORM public.assert_paid_beta_billing_ready();

  SELECT owner_id
    INTO v_owner_id
  FROM public.stores
  WHERE id = NEW.store_id;

  PERFORM public.assert_current_platform_policy_accepted(v_owner_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_paid_beta_invoice_settlement()
  FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_paid_beta_invoice_settlement()
  TO postgres;

DROP TRIGGER IF EXISTS enforce_paid_beta_invoice_settlement ON public.store_invoices;
CREATE TRIGGER enforce_paid_beta_invoice_settlement
BEFORE UPDATE OF status ON public.store_invoices
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.enforce_paid_beta_invoice_settlement();
