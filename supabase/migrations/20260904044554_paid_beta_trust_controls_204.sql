CREATE TABLE IF NOT EXISTS public.platform_policy_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  policy_version text NOT NULL,
  binding boolean NOT NULL DEFAULT false,
  acceptance_text text NOT NULL DEFAULT '',
  effective_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_policy_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_policy_config FROM public, anon, authenticated, service_role;
GRANT SELECT ON public.platform_policy_config TO service_role;
GRANT ALL ON public.platform_policy_config TO postgres;

INSERT INTO public.platform_policy_config(singleton, policy_version, binding, acceptance_text, effective_at)
VALUES (true, '2026-08-31-review-1', false, '', null)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  acceptance_text text NOT NULL,
  acceptance_context text NOT NULL CHECK (
    acceptance_context IN ('merchant_signup', 'billing', 'policy_update')
  ),
  document_paths jsonb NOT NULL DEFAULT '["/terms","/privacy","/billing-policy"]'::jsonb,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, policy_version)
);

CREATE INDEX IF NOT EXISTS platform_policy_acceptances_version_idx
  ON public.platform_policy_acceptances(policy_version, accepted_at DESC);

ALTER TABLE public.platform_policy_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_policy_acceptances FROM public, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.platform_policy_acceptances TO service_role;
GRANT ALL ON public.platform_policy_acceptances TO postgres;

CREATE OR REPLACE FUNCTION public.assert_current_platform_policy_accepted(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version text;
  v_binding boolean;
  v_effective_at timestamptz;
BEGIN
  SELECT policy_version, binding, effective_at
    INTO v_version, v_binding, v_effective_at
  FROM public.platform_policy_config
  WHERE singleton = true;

  IF COALESCE(v_binding, false) = false
     OR v_effective_at IS NULL
     OR now() < v_effective_at THEN
    RETURN;
  END IF;

  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.platform_policy_acceptances
    WHERE user_id = p_user_id
      AND policy_version = v_version
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'platform_policy_acceptance_required',
      DETAIL = COALESCE(v_version, 'unknown');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_current_platform_policy_accepted(uuid)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_current_platform_policy_accepted(uuid)
  TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.enforce_store_platform_policy_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_current_platform_policy_accepted(NEW.owner_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_store_platform_policy_acceptance ON public.stores;
CREATE TRIGGER enforce_store_platform_policy_acceptance
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_platform_policy_acceptance();

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

  SELECT owner_id
    INTO v_owner_id
  FROM public.stores
  WHERE id = NEW.store_id;

  PERFORM public.assert_current_platform_policy_accepted(v_owner_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_platform_policy_acceptance ON public.store_invoices;
CREATE TRIGGER enforce_invoice_platform_policy_acceptance
BEFORE INSERT ON public.store_invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invoice_platform_policy_acceptance();

CREATE TABLE IF NOT EXISTS public.platform_availability_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  monitoring_started_at timestamptz,
  commitment_percent numeric(5,2) NOT NULL DEFAULT 99.00
    CHECK (commitment_percent > 0 AND commitment_percent <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_availability_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_availability_config FROM public, anon, authenticated, service_role;
GRANT SELECT ON public.platform_availability_config TO service_role;
GRANT ALL ON public.platform_availability_config TO postgres;

INSERT INTO public.platform_availability_config(singleton, monitoring_started_at, commitment_percent)
VALUES (true, null, 99.00)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_availability_samples (
  slot_start timestamptz PRIMARY KEY,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'ezcomo-core' CHECK (source = 'ezcomo-core')
);

ALTER TABLE public.platform_availability_samples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_availability_samples FROM public, anon, authenticated, service_role;
GRANT SELECT ON public.platform_availability_samples TO service_role;
GRANT ALL ON public.platform_availability_samples TO postgres;

CREATE OR REPLACE FUNCTION public.record_platform_availability_success()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started timestamptz;
  v_slot timestamptz;
BEGIN
  SELECT monitoring_started_at
    INTO v_started
  FROM public.platform_availability_config
  WHERE singleton = true;

  IF v_started IS NULL OR now() < v_started + interval '5 minutes' THEN
    RETURN NULL;
  END IF;

  v_slot := date_bin(
    interval '5 minutes',
    now(),
    timestamptz '2000-01-01 00:00:00+00'
  ) - interval '5 minutes';

  IF v_slot < v_started THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.platform_availability_samples(slot_start)
  VALUES (v_slot)
  ON CONFLICT (slot_start) DO NOTHING;

  RETURN v_slot;
END;
$$;

REVOKE ALL ON FUNCTION public.record_platform_availability_success()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_platform_availability_success()
  TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.activate_platform_availability_monitoring()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_floor timestamptz;
  v_start timestamptz;
BEGIN
  v_floor := date_bin(
    interval '5 minutes',
    now(),
    timestamptz '2000-01-01 00:00:00+00'
  );

  v_start := CASE
    WHEN now() = v_floor THEN v_floor
    ELSE v_floor + interval '5 minutes'
  END;

  UPDATE public.platform_availability_config
  SET monitoring_started_at = COALESCE(monitoring_started_at, v_start),
      updated_at = now()
  WHERE singleton = true
  RETURNING monitoring_started_at INTO v_start;

  RETURN v_start;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_platform_availability_monitoring()
  FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_platform_availability_monitoring()
  TO postgres;

CREATE OR REPLACE FUNCTION public.platform_monthly_availability(
  p_month date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  period_start timestamptz,
  period_end timestamptz,
  monitoring_start timestamptz,
  expected_slots bigint,
  successful_slots bigint,
  missing_slots bigint,
  availability_percent numeric,
  commitment_percent numeric,
  meets_commitment boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started timestamptz;
  v_commitment numeric;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_completed_through timestamptz;
  v_start timestamptz;
  v_end timestamptz;
  v_expected bigint;
  v_success bigint;
  v_percent numeric;
BEGIN
  SELECT c.monitoring_started_at, c.commitment_percent
    INTO v_started, v_commitment
  FROM public.platform_availability_config AS c
  WHERE c.singleton = true;

  v_month_start := (
    date_trunc('month', p_month::timestamp) AT TIME ZONE 'UTC'
  );
  v_month_end := v_month_start + interval '1 month';
  v_completed_through := date_bin(
    interval '5 minutes',
    now(),
    timestamptz '2000-01-01 00:00:00+00'
  );

  period_start := v_month_start;
  period_end := LEAST(v_month_end, v_completed_through);
  monitoring_start := v_started;
  commitment_percent := v_commitment;

  IF v_started IS NULL THEN
    expected_slots := 0;
    successful_slots := 0;
    missing_slots := 0;
    availability_percent := NULL;
    meets_commitment := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_start := GREATEST(v_month_start, v_started);
  v_end := LEAST(v_month_end, v_completed_through);

  IF v_end <= v_start THEN
    expected_slots := 0;
    successful_slots := 0;
    missing_slots := 0;
    availability_percent := NULL;
    meets_commitment := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_expected := FLOOR(
    EXTRACT(EPOCH FROM (v_end - v_start)) / 300
  )::bigint;

  SELECT count(*)
    INTO v_success
  FROM public.platform_availability_samples AS s
  WHERE s.slot_start >= v_start
    AND s.slot_start < v_end;

  v_percent := CASE
    WHEN v_expected > 0
      THEN round((v_success::numeric * 100) / v_expected::numeric, 4)
    ELSE NULL
  END;

  expected_slots := v_expected;
  successful_slots := v_success;
  missing_slots := GREATEST(v_expected - v_success, 0);
  availability_percent := v_percent;
  meets_commitment := CASE
    WHEN v_percent IS NULL THEN NULL
    ELSE v_percent >= v_commitment
  END;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_monthly_availability(date)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_monthly_availability(date)
  TO service_role, postgres;

INSERT INTO public.internal_runtime_settings(key, value)
VALUES (
  'availability_probe_url',
  'https://ezcomo.vercel.app/api/platform/availability-probe'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.kick_platform_availability_probe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started timestamptz;
  v_url text;
  v_secret text;
BEGIN
  SELECT monitoring_started_at
    INTO v_started
  FROM public.platform_availability_config
  WHERE singleton = true;

  IF v_started IS NULL OR now() < v_started + interval '5 minutes' THEN
    RETURN;
  END IF;

  SELECT value
    INTO v_url
  FROM public.internal_runtime_settings
  WHERE key = 'availability_probe_url';

  SELECT value
    INTO v_secret
  FROM public.internal_runtime_settings
  WHERE key = 'notification_processor_secret';

  v_url := COALESCE(
    NULLIF(v_url, ''),
    current_setting('app.settings.availability_probe_url', true)
  );
  v_secret := COALESCE(
    NULLIF(v_secret, ''),
    current_setting('app.settings.notification_processor_secret', true)
  );

  IF COALESCE(v_url, '') <> '' AND COALESCE(v_secret, '') <> '' THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notification-queue-secret', v_secret
      ),
      body := '{}'::jsonb
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kick_platform_availability_probe()
  FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kick_platform_availability_probe()
  TO postgres;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
    INTO v_job_id
  FROM cron.job
  WHERE jobname = 'platform-availability-probe';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'platform-availability-probe',
    '*/5 * * * *',
    'SELECT public.kick_platform_availability_probe();'
  );
END;
$$;
