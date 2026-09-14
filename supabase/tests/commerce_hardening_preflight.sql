-- Read-only reconciliation preflight for the commerce hardening migration batch.
-- Run immediately before migration rollout. This file performs no writes.
DO $$
DECLARE
  _issue text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cart_items c
    LEFT JOIN public.products p ON p.id = c.product_id
    WHERE c.store_id IS NULL OR c.product_id IS NULL OR p.id IS NULL
       OR p.store_id IS DISTINCT FROM c.store_id
  ) THEN _issue := 'cart product/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.cart_items WHERE quantity < 1 OR quantity > 99
  ) THEN _issue := 'cart quantity outside 1..99'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.stock_notifications s
    LEFT JOIN public.products p ON p.id = s.product_id
    WHERE s.store_id IS NULL OR s.product_id IS NULL OR p.id IS NULL
       OR p.store_id IS DISTINCT FROM s.store_id
  ) THEN _issue := 'stock notification product/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.product_qa q
    LEFT JOIN public.products p ON p.id = q.product_id
    WHERE q.store_id IS NULL OR q.product_id IS NULL OR p.id IS NULL
       OR p.store_id IS DISTINCT FROM q.store_id
  ) THEN _issue := 'product QA product/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.coupon_codes WHERE store_id IS NULL
  ) THEN _issue := 'coupon without store'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.coupon_codes
    GROUP BY store_id, upper(trim(code)) HAVING count(*) > 1
  ) THEN _issue := 'duplicate normalized coupon code within store'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.coupon_codes
    WHERE discount_value < 0
       OR (discount_type = 'percentage' AND discount_value > 100)
       OR min_order < 0 OR uses_count < 0
       OR (max_uses IS NOT NULL AND max_uses < 1)
  ) THEN _issue := 'invalid coupon numeric value'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.products
    WHERE price < 0 OR stock < 0 OR (original_price IS NOT NULL AND original_price < 0)
  ) THEN _issue := 'invalid product numeric value'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.order_shipments s
    LEFT JOIN public.orders o ON o.id = s.order_id
    WHERE o.id IS NULL OR o.store_id IS DISTINCT FROM s.store_id
  ) THEN _issue := 'shipment order/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_revenue_events r
    LEFT JOIN public.orders o ON o.id = r.order_id
    WHERE o.id IS NULL OR o.store_id IS DISTINCT FROM r.store_id
  ) THEN _issue := 'revenue event order/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_analytics_events a
    LEFT JOIN public.orders o ON o.id = a.order_id
    LEFT JOIN public.products p ON p.id = a.product_id
    WHERE (a.order_id IS NOT NULL AND (o.id IS NULL OR o.store_id IS DISTINCT FROM a.store_id))
       OR (a.product_id IS NOT NULL AND (p.id IS NULL OR p.store_id IS DISTINCT FROM a.store_id))
  ) THEN _issue := 'analytics owned-reference mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.order_shipments s
    LEFT JOIN public.store_courier_connections c ON c.id = s.courier_connection_id
    WHERE s.courier_connection_id IS NOT NULL
      AND (c.id IS NULL OR c.store_id IS DISTINCT FROM s.store_id)
  ) THEN _issue := 'shipment courier/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_courier_credentials_secure sc
    LEFT JOIN public.store_courier_connections c ON c.id = sc.connection_id
    WHERE sc.connection_id IS NOT NULL
      AND (c.id IS NULL OR c.store_id IS DISTINCT FROM sc.store_id)
  ) THEN _issue := 'courier credential/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_cart_recovery_leads l
    LEFT JOIN public.orders o ON o.id = l.recovered_order_id
    WHERE l.recovered_order_id IS NOT NULL
      AND (o.id IS NULL OR o.store_id IS DISTINCT FROM l.store_id)
  ) THEN _issue := 'recovery lead/order store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_cart_recovery_messages m
    LEFT JOIN public.store_cart_recovery_leads l ON l.id = m.lead_id
    WHERE m.lead_id IS NOT NULL
      AND (l.id IS NULL OR l.store_id IS DISTINCT FROM m.store_id)
  ) THEN _issue := 'recovery message/lead store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.product_categories c
    LEFT JOIN public.product_categories p ON p.id = c.parent_id
    WHERE c.parent_id IS NOT NULL
      AND (p.id IS NULL OR p.store_id IS DISTINCT FROM c.store_id)
  ) THEN _issue := 'category parent/store mismatch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_return_requests WHERE refund_mode = 'store_credit'
  ) THEN _issue := 'legacy store-credit return row'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_return_requests
    WHERE (status = 'refunded' OR (status = 'completed' AND refund_mode IS NOT NULL))
      AND NULLIF(BTRIM(COALESCE(internal_note, '')), '') IS NULL
  ) THEN _issue := 'resolved refund without external settlement evidence'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM public.store_cart_recovery_messages
    WHERE scheduled_for IS NOT NULL
    GROUP BY store_id, lead_id, scheduled_for HAVING count(*) > 1
  ) THEN _issue := 'duplicate scheduled recovery touch'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1
    FROM public.orders o
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS match_count
      FROM regexp_matches(
        COALESCE(o.notes, ''),
        '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})',
        'g'
      ) AS m
    ) parsed
    WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
      AND parsed.match_count <> 1
  ) THEN _issue := 'manual-payment order without exactly one legacy transaction reference'; END IF;

  IF _issue IS NULL AND EXISTS (
    SELECT 1 FROM (
      SELECT
        CASE lower(trim(o.payment_method)) WHEN 'bkash_manual' THEN 'bkash' WHEN 'nagad' THEN 'nagad' END AS provider,
        min(upper(m[1])) AS normalized_reference
      FROM public.orders o
      CROSS JOIN LATERAL regexp_matches(
        COALESCE(o.notes, ''),
        '[Tt][Rr][Xx][Ii][Dd]:[[:space:]]*([A-Za-z0-9_-]{4,50})',
        'g'
      ) AS m
      WHERE lower(trim(o.payment_method)) IN ('bkash_manual', 'nagad')
      GROUP BY o.id, o.payment_method
    ) refs
    GROUP BY provider, normalized_reference HAVING count(*) > 1
  ) THEN _issue := 'duplicate legacy manual-payment provider/reference'; END IF;

  IF _issue IS NOT NULL THEN
    RAISE EXCEPTION 'commerce hardening preflight failed: %', _issue;
  END IF;
END;
$$;
