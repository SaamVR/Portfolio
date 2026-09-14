-- Read-only reconciliation preflight for P1 #326 sink identities.
-- Run before 20260914231000_order_background_effect_idempotency.sql.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.store_analytics_events
    WHERE order_id IS NOT NULL
      AND event_name = 'order_created'
    GROUP BY store_id, order_id, event_name
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'order background preflight failed: duplicate order_created analytics';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.store_analytics_events
    WHERE order_id IS NOT NULL
      AND product_id IS NOT NULL
      AND event_name = 'order_created_item'
    GROUP BY store_id, order_id, event_name, product_id, md5(metadata::text)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'order background preflight failed: duplicate order_created_item analytics';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.email_events
    WHERE store_id IS NOT NULL
      AND order_id IS NOT NULL
      AND template_name = 'order-created-merchant-notify-claim'
      AND channel = 'whatsapp'
    GROUP BY store_id, order_id, template_name, channel
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'order background preflight failed: duplicate merchant notification claims';
  END IF;
END;
$$;
