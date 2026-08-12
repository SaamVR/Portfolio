CREATE TABLE IF NOT EXISTS public.internal_runtime_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_runtime_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.internal_runtime_settings FROM public;
REVOKE ALL ON public.internal_runtime_settings FROM anon;
REVOKE ALL ON public.internal_runtime_settings FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_runtime_settings TO service_role;
GRANT ALL ON public.internal_runtime_settings TO postgres;

CREATE OR REPLACE FUNCTION public.kick_notification_queue_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url
  FROM public.internal_runtime_settings
  WHERE key = 'notification_processor_url';

  SELECT value INTO v_secret
  FROM public.internal_runtime_settings
  WHERE key = 'notification_processor_secret';

  v_url := COALESCE(NULLIF(v_url, ''), current_setting('app.settings.notification_processor_url', true));
  v_secret := COALESCE(NULLIF(v_secret, ''), current_setting('app.settings.notification_processor_secret', true));

  IF coalesce(v_url, '') <> '' AND coalesce(v_secret, '') <> '' THEN
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
