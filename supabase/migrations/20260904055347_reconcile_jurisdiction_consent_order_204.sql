CREATE TABLE IF NOT EXISTS public.platform_jurisdiction_enforcement_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  country_enforcement_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_jurisdiction_enforcement_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_jurisdiction_enforcement_config FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_jurisdiction_enforcement_config TO service_role;
GRANT ALL ON public.platform_jurisdiction_enforcement_config TO postgres;

INSERT INTO public.platform_jurisdiction_enforcement_config(singleton, country_enforcement_enabled)
VALUES (true, false)
ON CONFLICT(singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assert_current_platform_policy_accepted(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enforcement_enabled boolean;
  v_version text;
  v_binding boolean;
  v_effective_at timestamptz;
  v_country text;
  v_regime text;
  v_contract_required boolean;
  v_privacy_required boolean;
BEGIN
  SELECT country_enforcement_enabled
    INTO v_enforcement_enabled
  FROM public.platform_jurisdiction_enforcement_config
  WHERE singleton = true;

  IF COALESCE(v_enforcement_enabled, false) = false THEN
    RETURN;
  END IF;

  SELECT business_country_code, legal_regime
    INTO v_country, v_regime
  FROM public.merchant_legal_profiles
  WHERE user_id = p_user_id;

  IF COALESCE(v_country, '') = '' OR COALESCE(v_regime, '') = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'merchant_country_required';
  END IF;

  SELECT policy_version, binding, effective_at
    INTO v_version, v_binding, v_effective_at
  FROM public.platform_policy_config
  WHERE singleton = true;

  IF COALESCE(v_binding, false) = false
     OR v_effective_at IS NULL
     OR now() < v_effective_at THEN
    RETURN;
  END IF;

  SELECT merchant_contract_acceptance_required, privacy_acknowledgement_required
    INTO v_contract_required, v_privacy_required
  FROM public.platform_jurisdiction_rules
  WHERE legal_regime = v_regime;

  IF COALESCE(v_contract_required, true) = false
     AND COALESCE(v_privacy_required, true) = false THEN
    RETURN;
  END IF;

  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.platform_policy_acceptances a
    WHERE a.user_id = p_user_id
      AND a.policy_version = v_version
      AND a.business_country_code = v_country
      AND a.legal_regime = v_regime
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'platform_policy_acceptance_required',
      DETAIL = concat_ws(':', COALESCE(v_version, 'unknown'), v_country, v_regime);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_current_platform_policy_accepted(uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_current_platform_policy_accepted(uuid)
  TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.activate_platform_policy_version(
  p_policy_version text,
  p_effective_at timestamptz,
  p_approved_by uuid DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version text := btrim(COALESCE(p_policy_version, ''));
  v_site_name text;
  v_legal_operator text;
  v_acceptance_text text;
  v_jurisdiction_enforcement boolean;
  v_existing public.platform_policy_versions%rowtype;
BEGIN
  IF v_version = '' OR char_length(v_version) > 120 THEN RAISE EXCEPTION 'invalid policy version'; END IF;
  IF p_effective_at IS NULL THEN RAISE EXCEPTION 'effective_at is required'; END IF;

  SELECT country_enforcement_enabled
    INTO v_jurisdiction_enforcement
  FROM public.platform_jurisdiction_enforcement_config
  WHERE singleton = true;

  IF COALESCE(v_jurisdiction_enforcement, false) = false THEN
    RAISE EXCEPTION 'jurisdiction enforcement must be enabled before policy activation';
  END IF;

  SELECT site_name, legal_operator_name
    INTO v_site_name, v_legal_operator
  FROM public.platform_identity_config
  WHERE singleton = true;

  IF COALESCE(btrim(v_site_name), '') = '' THEN RAISE EXCEPTION 'site name must be configured before policy activation'; END IF;
  IF COALESCE(btrim(v_legal_operator), '') = '' THEN RAISE EXCEPTION 'legal operator name must be configured before policy activation'; END IF;

  v_acceptance_text := format(
    'I agree to the %s Terms of Service and Billing, Renewal, Cancellation & Refund Policy, and I acknowledge the %s Privacy Policy, version %s.',
    v_site_name,
    v_site_name,
    v_version
  );

  SELECT * INTO v_existing
  FROM public.platform_policy_versions
  WHERE policy_version = v_version;

  IF FOUND THEN
    IF v_existing.site_name_snapshot IS DISTINCT FROM v_site_name
       OR v_existing.legal_operator_name_snapshot IS DISTINCT FROM v_legal_operator
       OR v_existing.acceptance_text IS DISTINCT FROM v_acceptance_text
       OR v_existing.effective_at IS DISTINCT FROM p_effective_at THEN
      RAISE EXCEPTION 'policy version already exists with a different immutable snapshot';
    END IF;
  ELSE
    INSERT INTO public.platform_policy_versions(
      policy_version, effective_at, site_name_snapshot, legal_operator_name_snapshot,
      acceptance_text, document_paths, status, approved_at, approved_by
    ) VALUES (
      v_version, p_effective_at, v_site_name, v_legal_operator, v_acceptance_text,
      '["/terms","/privacy","/billing-policy"]'::jsonb, 'binding', now(), p_approved_by
    );
  END IF;

  UPDATE public.platform_policy_versions
  SET status = 'retired'
  WHERE status = 'binding' AND policy_version <> v_version;

  UPDATE public.platform_policy_versions
  SET status = 'binding'
  WHERE policy_version = v_version;

  UPDATE public.platform_policy_config
  SET policy_version = v_version,
      binding = true,
      acceptance_text = v_acceptance_text,
      effective_at = p_effective_at,
      site_name_snapshot = v_site_name,
      legal_operator_name_snapshot = v_legal_operator,
      updated_at = now()
  WHERE singleton = true;

  RETURN jsonb_build_object(
    'policy_version', v_version,
    'effective_at', p_effective_at,
    'site_name_snapshot', v_site_name,
    'legal_operator_name_snapshot', v_legal_operator,
    'acceptance_text', v_acceptance_text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_platform_policy_version(text,timestamptz,uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_platform_policy_version(text,timestamptz,uuid)
  TO service_role, postgres;
