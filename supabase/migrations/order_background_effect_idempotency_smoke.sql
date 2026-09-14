-- Read-only post-migration smoke for P1 #326 order-background retry safety.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'store_analytics_events'
      AND indexname = 'idx_store_analytics_order_created_once'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(store_id, order_id, event_name)%'
      AND indexdef ILIKE '%order_created%'
  ) THEN
    RAISE EXCEPTION 'order-created analytics idempotency index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'store_analytics_events'
      AND indexname = 'idx_store_analytics_order_created_item_once'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(store_id, order_id, event_name, product_id)%'
      AND indexdef ILIKE '%order_created_item%'
  ) THEN
    RAISE EXCEPTION 'order-created item analytics idempotency index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'email_events'
      AND indexname = 'idx_email_events_order_created_merchant_notify_claim_once'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(store_id, order_id, template_name, channel)%'
      AND indexdef ILIKE '%order-created-merchant-notify-claim%'
  ) THEN
    RAISE EXCEPTION 'merchant order notification claim identity is missing';
  END IF;
END;
$$;
