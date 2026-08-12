CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.email_events
  DROP CONSTRAINT IF EXISTS email_events_status_check;

ALTER TABLE public.email_events
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_token uuid;

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_status_check
  CHECK (
    status IN (
      'queued',
      'processing',
      'sent',
      'skipped',
      'failed',
      'retrying',
      'dead_letter',
      'delivered',
      'bounced'
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_events_dispatch_queue
  ON public.email_events(status, next_retry_at, processing_started_at, created_at);

CREATE OR REPLACE FUNCTION public.enqueue_trigger_email_event(
  _store_id uuid,
  _order_id text,
  _template_name text,
  _recipient text,
  _payload jsonb,
  _channel text DEFAULT 'email'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.email_events (
    store_id,
    order_id,
    template_name,
    recipient,
    channel,
    status,
    retry_count,
    metadata
  )
  VALUES (
    _store_id,
    _order_id,
    _template_name,
    _recipient,
    COALESCE(NULLIF(_channel, ''), 'email'),
    'queued',
    0,
    jsonb_build_object(
      'source', 'database_trigger',
      'retry_payload', COALESCE(_payload, '{}'::jsonb)
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_trigger_email_event(uuid, text, text, text, jsonb, text) FROM public;
REVOKE ALL ON FUNCTION public.enqueue_trigger_email_event(uuid, text, text, text, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.enqueue_trigger_email_event(uuid, text, text, text, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_trigger_email_event(uuid, text, text, text, jsonb, text) TO service_role;
GRANT ALL ON FUNCTION public.enqueue_trigger_email_event(uuid, text, text, text, jsonb, text) TO postgres;

CREATE OR REPLACE FUNCTION public.handle_subscription_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_store_name text;
  v_store_slug text;
  v_payload jsonb;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT s.name, s.slug, u.email INTO v_store_name, v_store_slug, v_owner_email
    FROM public.stores s
    JOIN auth.users u ON s.owner_id = u.id
    WHERE s.id = NEW.store_id;

    IF v_owner_email IS NOT NULL AND NEW.status = 'past_due' THEN
      v_payload := jsonb_build_object(
        'to', v_owner_email,
        'templateName', 'payment-reminder',
        'storeName', v_store_name,
        'storeSlug', v_store_slug
      );

      PERFORM public.enqueue_trigger_email_event(
        NEW.store_id,
        NULL,
        'payment-reminder',
        v_owner_email,
        v_payload,
        'email'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_order_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_template text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_template := 'order-receipt';
    v_payload := jsonb_build_object(
      'templateName', v_template,
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('shipped', 'delivered', 'cancelled') THEN
    v_template := 'order-' || NEW.status;
    v_payload := jsonb_build_object(
      'templateName', v_template,
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  END IF;

  IF v_payload IS NOT NULL THEN
    PERFORM public.enqueue_trigger_email_event(
      NEW.store_id,
      NEW.order_number,
      v_template,
      NEW.customer_email,
      v_payload,
      'email'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_lifecycle_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
  v_store_owner_id uuid;
  v_store_name text;
  v_store_slug text;
  v_template text;
BEGIN
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    SELECT owner_id, name, slug INTO v_store_owner_id, v_store_name, v_store_slug
    FROM public.stores
    WHERE id = NEW.store_id;

    IF v_store_owner_id IS NOT NULL THEN
      SELECT email INTO v_owner_email
      FROM auth.users
      WHERE id = v_store_owner_id;

      IF v_owner_email IS NOT NULL THEN
        IF NEW.lifecycle_status = 'reminded' THEN
          v_template := 'inactivity-warning';
          v_payload := jsonb_build_object(
            'to', v_owner_email,
            'templateName', v_template,
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        ELSIF NEW.lifecycle_status = 'deletion_queued' THEN
          v_template := 'deletion-notice';
          v_payload := jsonb_build_object(
            'to', v_owner_email,
            'templateName', v_template,
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        END IF;

        IF v_payload IS NOT NULL THEN
          PERFORM public.enqueue_trigger_email_event(
            NEW.store_id,
            NULL,
            v_template,
            v_owner_email,
            v_payload,
            'email'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
BEGIN
  IF (OLD.is_published IS FALSE OR OLD.is_published IS NULL) AND NEW.is_published IS TRUE THEN
    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = NEW.owner_id;

    IF v_owner_email IS NOT NULL THEN
      v_payload := jsonb_build_object(
        'to', v_owner_email,
        'templateName', 'store-published',
        'storeName', NEW.name,
        'storeSlug', NEW.slug
      );

      PERFORM public.enqueue_trigger_email_event(
        NEW.id,
        NULL,
        'store-published',
        v_owner_email,
        v_payload,
        'email'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_email_events(
  _limit integer DEFAULT 25,
  _lease_minutes integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  template_name text,
  recipient text,
  channel text,
  metadata jsonb,
  retry_count integer,
  status text,
  order_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT event.id
    FROM public.email_events AS event
    WHERE
      event.status = 'queued'
      OR (event.status = 'retrying' AND COALESCE(event.next_retry_at, now()) <= now())
      OR (event.status = 'processing' AND event.processing_started_at <= now() - make_interval(mins => GREATEST(_lease_minutes, 1)))
    ORDER BY event.created_at ASC
    LIMIT GREATEST(_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_events AS event
  SET
    status = 'processing',
    processing_started_at = now(),
    processing_token = gen_random_uuid(),
    last_attempt_at = now()
  FROM candidates
  WHERE event.id = candidates.id
  RETURNING
    event.id,
    event.store_id,
    event.template_name,
    event.recipient,
    event.channel,
    event.metadata,
    event.retry_count,
    event.status,
    event.order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_email_events(integer, integer) FROM public;
REVOKE ALL ON FUNCTION public.claim_due_email_events(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_due_email_events(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_email_events(integer, integer) TO service_role;
GRANT ALL ON FUNCTION public.claim_due_email_events(integer, integer) TO postgres;

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
  v_url := current_setting('app.settings.notification_processor_url', true);
  v_secret := current_setting('app.settings.notification_processor_secret', true);

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

REVOKE ALL ON FUNCTION public.kick_notification_queue_processor() FROM public;
REVOKE ALL ON FUNCTION public.kick_notification_queue_processor() FROM anon;
REVOKE ALL ON FUNCTION public.kick_notification_queue_processor() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.kick_notification_queue_processor() TO service_role;
GRANT ALL ON FUNCTION public.kick_notification_queue_processor() TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification-queue-processor') THEN
    PERFORM cron.unschedule('notification-queue-processor');
  END IF;

  PERFORM cron.schedule(
    'notification-queue-processor',
    '* * * * *',
    'SELECT public.kick_notification_queue_processor()'
  );
END;
$$;
