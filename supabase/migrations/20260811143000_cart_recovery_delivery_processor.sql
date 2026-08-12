ALTER TABLE public.store_cart_recovery_messages
  DROP CONSTRAINT IF EXISTS store_cart_recovery_messages_status_check;

ALTER TABLE public.store_cart_recovery_messages
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_token uuid;

ALTER TABLE public.store_cart_recovery_messages
  ADD CONSTRAINT store_cart_recovery_messages_status_check
  CHECK (
    status IN (
      'queued',
      'processing',
      'sent',
      'failed',
      'retrying',
      'dead_letter',
      'skipped',
      'opted_out'
    )
  );

CREATE INDEX IF NOT EXISTS idx_store_cart_recovery_messages_dispatch_queue
  ON public.store_cart_recovery_messages(status, next_retry_at, processing_started_at, created_at);

CREATE OR REPLACE FUNCTION public.claim_due_cart_recovery_messages(
  _limit integer DEFAULT 25,
  _lease_minutes integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  lead_id uuid,
  channel text,
  template_key text,
  status text,
  retry_count integer,
  contact_email text,
  contact_phone text,
  contact_name text,
  store_name text,
  store_slug text,
  coupon_code text,
  cart_value integer,
  item_count integer,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT message.id
    FROM public.store_cart_recovery_messages AS message
    WHERE
      message.status = 'queued'
      OR (message.status = 'retrying' AND COALESCE(message.next_retry_at, now()) <= now())
      OR (message.status = 'processing' AND message.processing_started_at <= now() - make_interval(mins => GREATEST(_lease_minutes, 1)))
    ORDER BY message.created_at ASC
    LIMIT GREATEST(_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.store_cart_recovery_messages AS message
  SET
    status = 'processing',
    processing_started_at = now(),
    processing_token = gen_random_uuid()
  FROM candidates
  WHERE message.id = candidates.id
  RETURNING
    message.id,
    message.store_id,
    message.lead_id,
    message.channel,
    message.template_key,
    message.status,
    message.retry_count,
    lead.contact_email,
    lead.contact_phone,
    lead.contact_name,
    store.name,
    store.slug,
    message.coupon_code,
    lead.cart_value,
    lead.item_count,
    message.metadata;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) FROM public;
REVOKE ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) TO service_role;
GRANT ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) TO postgres;

CREATE OR REPLACE FUNCTION public.kick_cart_recovery_queue_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  v_url := current_setting('app.settings.cart_recovery_processor_url', true);
  v_secret := current_setting('app.settings.cart_recovery_processor_secret', true);

  IF coalesce(v_url, '') <> '' AND coalesce(v_secret, '') <> '' THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cart-recovery-queue-secret', v_secret
      ),
      body := '{}'::jsonb
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kick_cart_recovery_queue_processor() FROM public;
REVOKE ALL ON FUNCTION public.kick_cart_recovery_queue_processor() FROM anon;
REVOKE ALL ON FUNCTION public.kick_cart_recovery_queue_processor() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.kick_cart_recovery_queue_processor() TO service_role;
GRANT ALL ON FUNCTION public.kick_cart_recovery_queue_processor() TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cart-recovery-queue-processor') THEN
    PERFORM cron.unschedule('cart-recovery-queue-processor');
  END IF;

  PERFORM cron.schedule(
    'cart-recovery-queue-processor',
    '* * * * *',
    'SELECT public.kick_cart_recovery_queue_processor()'
  );
END;
$$;
