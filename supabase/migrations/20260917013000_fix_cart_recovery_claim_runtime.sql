-- Runtime-7 acceptance repair: make the cart-recovery delivery claim executable.
--
-- The historical processor migration returned lead/store columns directly from
-- UPDATE ... RETURNING without joining those relations in that statement. The
-- function therefore compiled but raised 42P01 when a real queued message was
-- claimed. Preserve history and repair the function forward-only.

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
    SELECT queued.id
    FROM public.store_cart_recovery_messages AS queued
    WHERE
      queued.status = 'queued'
      OR (queued.status = 'retrying' AND COALESCE(queued.next_retry_at, now()) <= now())
      OR (
        queued.status = 'processing'
        AND queued.processing_started_at <= now() - make_interval(mins => GREATEST(_lease_minutes, 1))
      )
    ORDER BY queued.created_at ASC
    LIMIT GREATEST(_limit, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
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
      message.coupon_code,
      message.metadata
  )
  SELECT
    claimed.id,
    claimed.store_id,
    claimed.lead_id,
    claimed.channel,
    claimed.template_key,
    claimed.status,
    claimed.retry_count,
    lead.contact_email,
    lead.contact_phone,
    lead.contact_name,
    store.name,
    store.slug,
    claimed.coupon_code,
    lead.cart_value,
    lead.item_count,
    claimed.metadata
  FROM claimed
  JOIN public.store_cart_recovery_leads AS lead
    ON lead.id = claimed.lead_id
   AND lead.store_id = claimed.store_id
  JOIN public.stores AS store
    ON store.id = claimed.store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) FROM public;
REVOKE ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) TO service_role;
GRANT ALL ON FUNCTION public.claim_due_cart_recovery_messages(integer, integer) TO postgres;
