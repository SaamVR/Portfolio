-- P1 #326: make retryable order-background effects safe under duplicate delivery.
--
-- Order creation is not settlement authority (#312). The only order-created
-- analytics retained here are non-financial funnel facts, while merchant order
-- notification is explicitly best-effort. Both still need stable sink identity
-- so queue redelivery cannot duplicate them.

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
    RAISE EXCEPTION 'order_background_reconciliation_required: duplicate order_created analytics rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.store_analytics_events
    WHERE order_id IS NOT NULL
      AND product_id IS NOT NULL
      AND event_name = 'order_created_item'
    GROUP BY store_id, order_id, event_name, product_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'order_background_reconciliation_required: duplicate order_created_item analytics rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.email_events
    WHERE store_id IS NOT NULL
      AND order_id IS NOT NULL
      AND template_name = 'whatsapp-merchant-order-notify'
      AND channel = 'whatsapp'
    GROUP BY store_id, order_id, template_name, channel
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'order_background_reconciliation_required: duplicate merchant order notification rows';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_analytics_order_created_once
  ON public.store_analytics_events (store_id, order_id, event_name)
  WHERE order_id IS NOT NULL
    AND event_name = 'order_created';

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_analytics_order_created_item_once
  ON public.store_analytics_events (store_id, order_id, event_name, product_id)
  WHERE order_id IS NOT NULL
    AND product_id IS NOT NULL
    AND event_name = 'order_created_item';

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_merchant_order_notify_once
  ON public.email_events (store_id, order_id, template_name, channel)
  WHERE store_id IS NOT NULL
    AND order_id IS NOT NULL
    AND template_name = 'whatsapp-merchant-order-notify'
    AND channel = 'whatsapp';
