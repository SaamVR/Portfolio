BEGIN;

INSERT INTO public.stores (id, name, slug)
VALUES (
  '00000000-0000-4000-8000-000000000384',
  'Runtime 7 cart recovery claim smoke',
  'runtime-7-cart-recovery-claim-smoke'
);

INSERT INTO public.store_cart_recovery_leads (
  id,
  store_id,
  contact_email,
  contact_consent_status,
  cart_snapshot,
  cart_value,
  item_count,
  status,
  next_contact_at
)
VALUES (
  '00000000-0000-4000-8000-000000000385',
  '00000000-0000-4000-8000-000000000384',
  'runtime-7-cart-recovery@example.invalid',
  'accepted',
  '[]'::jsonb,
  1200,
  2,
  'abandoned',
  now() - interval '1 minute'
);

INSERT INTO public.store_cart_recovery_messages (
  id,
  store_id,
  lead_id,
  channel,
  template_key,
  status,
  retry_count,
  scheduled_for,
  created_at
)
VALUES (
  '00000000-0000-4000-8000-000000000386',
  '00000000-0000-4000-8000-000000000384',
  '00000000-0000-4000-8000-000000000385',
  'email',
  'recovery-sequence',
  'queued',
  0,
  now() - interval '1 minute',
  '2000-01-01 00:00:00+00'::timestamptz
);

DO $$
DECLARE
  claimed record;
  second_claim_count integer;
  persisted_status text;
BEGIN
  SELECT *
  INTO claimed
  FROM public.claim_due_cart_recovery_messages(1, 10);

  IF claimed.id IS DISTINCT FROM '00000000-0000-4000-8000-000000000386'::uuid THEN
    RAISE EXCEPTION 'cart recovery claim did not return the queued smoke message';
  END IF;

  IF claimed.status IS DISTINCT FROM 'processing'
    OR claimed.contact_email IS DISTINCT FROM 'runtime-7-cart-recovery@example.invalid'
    OR claimed.store_name IS DISTINCT FROM 'Runtime 7 cart recovery claim smoke'
    OR claimed.store_slug IS DISTINCT FROM 'runtime-7-cart-recovery-claim-smoke'
    OR claimed.cart_value IS DISTINCT FROM 1200
    OR claimed.item_count IS DISTINCT FROM 2
  THEN
    RAISE EXCEPTION 'cart recovery claim did not return authoritative lead/store delivery context';
  END IF;

  SELECT count(*)
  INTO second_claim_count
  FROM public.claim_due_cart_recovery_messages(1, 10);

  IF second_claim_count <> 0 THEN
    RAISE EXCEPTION 'cart recovery claim re-claimed an active leased message';
  END IF;

  SELECT status
  INTO persisted_status
  FROM public.store_cart_recovery_messages
  WHERE id = '00000000-0000-4000-8000-000000000386'::uuid;

  IF persisted_status IS DISTINCT FROM 'processing' THEN
    RAISE EXCEPTION 'cart recovery claim did not persist processing state';
  END IF;
END
$$;

ROLLBACK;
