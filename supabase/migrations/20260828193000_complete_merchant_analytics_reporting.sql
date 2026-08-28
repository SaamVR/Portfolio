-- Complete merchant analytics reporting without browser row caps.
-- SECURITY INVOKER keeps underlying RLS active; explicit store checks fail closed
-- if a caller mixes an unauthorized store id into a requested scope.
CREATE OR REPLACE FUNCTION public.get_store_analytics_report(
  _store_ids uuid[],
  _start_at timestamptz,
  _end_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _unauthorized integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(array_length(_store_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'at least one store id is required' USING ERRCODE = '22023';
  END IF;
  IF _start_at IS NULL OR _end_at IS NULL OR _end_at < _start_at THEN
    RAISE EXCEPTION 'invalid analytics date range' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO _unauthorized
  FROM unnest(_store_ids) AS requested(store_id)
  WHERE NOT public.can_manage_store(requested.store_id, auth.uid());

  IF _unauthorized > 0 THEN
    RAISE EXCEPTION 'analytics scope contains an unauthorized store' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH events AS (
      SELECT *
      FROM public.store_analytics_events e
      WHERE e.store_id = ANY(_store_ids)
        AND e.event_timestamp >= _start_at
        AND e.event_timestamp <= _end_at
    ),
    revenue AS (
      SELECT *
      FROM public.store_revenue_events r
      WHERE r.store_id = ANY(_store_ids)
        AND r.event_timestamp >= _start_at
        AND r.event_timestamp <= _end_at
    ),
    event_totals AS (
      SELECT
        count(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) AS visitors,
        count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) AS sessions,
        count(*) FILTER (WHERE event_name = 'search') AS searches,
        count(*) FILTER (WHERE event_name = 'page_view') AS page_views,
        count(*) FILTER (WHERE event_name = 'view_item') AS product_views,
        count(*) FILTER (WHERE event_name = 'add_to_cart') AS add_to_cart,
        count(*) FILTER (WHERE event_name = 'begin_checkout') AS checkout_starts,
        count(*) FILTER (WHERE event_name = 'purchase') AS purchases,
        COALESCE(sum(value) FILTER (WHERE event_name = 'purchase'), 0) AS revenue,
        count(*) FILTER (WHERE event_name = 'add_to_wishlist') AS wishlist_adds
      FROM events
    ),
    revenue_totals AS (
      SELECT
        COALESCE(sum(net_amount), 0) AS net_sales,
        COALESCE(sum(refund_amount), 0) AS refunded_amount
      FROM revenue
    ),
    repeat_customers AS (
      SELECT count(*) AS repeat_customers
      FROM (
        SELECT customer_id
        FROM revenue
        WHERE customer_id IS NOT NULL AND event_type = 'sale'
        GROUP BY customer_id
        HAVING count(*) > 1
      ) repeated
    ),
    source_counts AS (
      SELECT COALESCE(NULLIF(btrim(traffic_source), ''), 'direct') AS label, count(*)::bigint AS value
      FROM events GROUP BY 1 ORDER BY value DESC LIMIT 6
    ),
    medium_counts AS (
      SELECT btrim(traffic_medium) AS label, count(*)::bigint AS value
      FROM events WHERE NULLIF(btrim(traffic_medium), '') IS NOT NULL
      GROUP BY 1 ORDER BY value DESC LIMIT 6
    ),
    campaign_counts AS (
      SELECT btrim(traffic_campaign) AS label, count(*)::bigint AS value
      FROM events WHERE NULLIF(btrim(traffic_campaign), '') IS NOT NULL
      GROUP BY 1 ORDER BY value DESC LIMIT 6
    ),
    search_counts AS (
      SELECT lower(btrim(search_query)) AS label, count(*)::bigint AS value
      FROM events
      WHERE event_name = 'search' AND NULLIF(btrim(search_query), '') IS NOT NULL
      GROUP BY 1 ORDER BY value DESC LIMIT 8
    ),
    zero_search_counts AS (
      SELECT lower(btrim(search_query)) AS label, count(*)::bigint AS value
      FROM events
      WHERE event_name = 'search'
        AND NULLIF(btrim(search_query), '') IS NOT NULL
        AND CASE
          WHEN COALESCE(metadata->>'resultsCount', '') ~ '^-?[0-9]+(?:[.][0-9]+)?$'
            THEN (metadata->>'resultsCount')::numeric = 0
          ELSE true
        END
      GROUP BY 1 ORDER BY value DESC LIMIT 8
    ),
    page_counts AS (
      SELECT COALESCE(NULLIF(btrim(page_path), ''), NULLIF(btrim(page_type), '')) AS label, count(*)::bigint AS value
      FROM events
      WHERE COALESCE(NULLIF(btrim(page_path), ''), NULLIF(btrim(page_type), '')) IS NOT NULL
      GROUP BY 1 ORDER BY value DESC LIMIT 8
    ),
    product_rows AS (
      SELECT
        product_id::text AS product_id,
        COALESCE(
          max(NULLIF(metadata->>'productName', '')),
          max(NULLIF(metadata->>'item_name', '')),
          max(NULLIF(metadata->>'name', '')),
          'Unnamed product'
        ) AS label,
        count(*) FILTER (WHERE event_name = 'view_item')::bigint AS views,
        count(*) FILTER (WHERE event_name = 'add_to_cart')::bigint AS carts,
        count(*) FILTER (WHERE event_name = 'add_to_wishlist')::bigint AS wishlists,
        COALESCE(sum(CASE WHEN event_name = 'purchase_item' THEN COALESCE(NULLIF(quantity, 0), 1) ELSE 0 END), 0)::bigint AS purchases,
        COALESCE(sum(value) FILTER (WHERE event_name = 'purchase_item'), 0)::bigint AS revenue
      FROM events
      WHERE product_id IS NOT NULL
      GROUP BY product_id
    ),
    top_products AS (
      SELECT * FROM product_rows
      ORDER BY revenue DESC, carts DESC, views DESC
      LIMIT 10
    ),
    profitable_channels AS (
      SELECT
        CASE
          WHEN NULLIF(btrim(attribution_medium), '') IS NOT NULL
            THEN COALESCE(NULLIF(btrim(attribution_source), ''), 'direct') || ' / ' || btrim(attribution_medium)
          ELSE COALESCE(NULLIF(btrim(attribution_source), ''), 'direct')
        END AS label,
        COALESCE(sum(net_amount), 0)::bigint AS value
      FROM revenue
      GROUP BY 1 ORDER BY value DESC LIMIT 6
    ),
    store_event AS (
      SELECT
        store_id,
        count(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL)::bigint AS visitors,
        count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::bigint AS sessions,
        count(*) FILTER (WHERE event_name = 'search')::bigint AS searches,
        count(*) FILTER (WHERE event_name = 'page_view')::bigint AS page_views,
        count(*) FILTER (WHERE event_name = 'add_to_cart')::bigint AS add_to_cart,
        count(*) FILTER (WHERE event_name = 'begin_checkout')::bigint AS checkout_starts,
        count(*) FILTER (WHERE event_name = 'purchase')::bigint AS purchases,
        COALESCE(sum(value) FILTER (WHERE event_name = 'purchase'), 0)::bigint AS revenue
      FROM events GROUP BY store_id
    ),
    requested_stores AS (SELECT DISTINCT unnest(_store_ids) AS store_id),
    store_summaries AS (
      SELECT
        s.store_id,
        COALESCE(e.visitors, 0) AS visitors,
        COALESCE(e.sessions, 0) AS sessions,
        COALESCE(e.searches, 0) AS searches,
        COALESCE(e.page_views, 0) AS page_views,
        COALESCE(e.add_to_cart, 0) AS add_to_cart,
        COALESCE(e.checkout_starts, 0) AS checkout_starts,
        COALESCE(e.purchases, 0) AS purchases,
        COALESCE(e.revenue, 0) AS revenue
      FROM requested_stores s LEFT JOIN store_event e USING (store_id)
    ),
    blog_view AS (
      SELECT
        regexp_replace(trim(trailing '/' from split_part(page_path, '?', 1)), '^.*/blog/', '') AS slug,
        count(*)::bigint AS views
      FROM events
      WHERE event_name = 'page_view'
        AND page_type = 'blog_article'
        AND split_part(COALESCE(page_path, ''), '?', 1) LIKE '%/blog/%'
      GROUP BY 1
    ),
    blog_event AS (
      SELECT
        btrim(traffic_campaign) AS slug,
        count(*) FILTER (WHERE event_name = 'blog_cta_click')::bigint AS cta_clicks,
        count(*) FILTER (WHERE event_name = 'view_item')::bigint AS product_views,
        count(*) FILTER (WHERE event_name = 'add_to_cart')::bigint AS carts,
        count(*) FILTER (WHERE event_name = 'begin_checkout')::bigint AS checkouts
      FROM events
      WHERE traffic_source = 'blog' AND traffic_medium = 'editorial'
        AND NULLIF(btrim(traffic_campaign), '') IS NOT NULL
      GROUP BY 1
    ),
    blog_revenue AS (
      SELECT
        btrim(attribution_campaign) AS slug,
        count(*) FILTER (WHERE event_type = 'sale')::bigint AS orders,
        COALESCE(sum(net_amount), 0)::bigint AS revenue
      FROM revenue
      WHERE attribution_source = 'blog' AND attribution_medium = 'editorial'
        AND NULLIF(btrim(attribution_campaign), '') IS NOT NULL
      GROUP BY 1
    ),
    blog_slugs AS (
      SELECT slug FROM blog_view UNION SELECT slug FROM blog_event UNION SELECT slug FROM blog_revenue
    ),
    blog_articles AS (
      SELECT
        s.slug,
        COALESCE(v.views, 0) AS views,
        COALESCE(e.cta_clicks, 0) AS cta_clicks,
        COALESCE(e.product_views, 0) AS product_views,
        COALESCE(e.carts, 0) AS carts,
        COALESCE(e.checkouts, 0) AS checkouts,
        COALESCE(r.orders, 0) AS orders,
        COALESCE(r.revenue, 0) AS revenue
      FROM blog_slugs s
      LEFT JOIN blog_view v USING (slug)
      LEFT JOIN blog_event e USING (slug)
      LEFT JOIN blog_revenue r USING (slug)
    )
    SELECT jsonb_build_object(
      'summary', jsonb_build_object(
        'visitors', t.visitors,
        'sessions', t.sessions,
        'searches', t.searches,
        'pageViews', t.page_views,
        'productViews', t.product_views,
        'addToCart', t.add_to_cart,
        'checkoutStarts', t.checkout_starts,
        'purchases', t.purchases,
        'revenue', t.revenue,
        'netSales', r.net_sales,
        'refundedAmount', r.refunded_amount,
        'averageOrderValue', CASE WHEN t.purchases > 0 THEN t.revenue::numeric / t.purchases ELSE 0 END,
        'visitorToPurchaseRate', CASE WHEN t.visitors > 0 THEN t.purchases::numeric / t.visitors ELSE 0 END,
        'cartToCheckoutRate', CASE WHEN t.add_to_cart > 0 THEN t.checkout_starts::numeric / t.add_to_cart ELSE 0 END,
        'checkoutCompletionRate', CASE WHEN t.checkout_starts > 0 THEN t.purchases::numeric / t.checkout_starts ELSE 0 END,
        'wishlistAdds', t.wishlist_adds,
        'repeatCustomers', rc.repeat_customers,
        'topSources', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM source_counts), '[]'::jsonb),
        'topMediums', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM medium_counts), '[]'::jsonb),
        'topCampaigns', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM campaign_counts), '[]'::jsonb),
        'topProfitableChannels', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM profitable_channels), '[]'::jsonb),
        'topSearches', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM search_counts), '[]'::jsonb),
        'zeroResultSearches', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM zero_search_counts), '[]'::jsonb),
        'topProducts', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'productId', product_id, 'label', label, 'views', views, 'carts', carts,
          'wishlists', wishlists, 'purchases', purchases, 'revenue', revenue,
          'conversionRate', CASE WHEN views > 0 THEN purchases::numeric / views ELSE 0 END
        ) ORDER BY revenue DESC, carts DESC, views DESC) FROM top_products), '[]'::jsonb),
        'topPages', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value) ORDER BY value DESC) FROM page_counts), '[]'::jsonb),
        'funnel', jsonb_build_array(
          jsonb_build_object('label', 'Visitors', 'value', t.visitors),
          jsonb_build_object('label', 'Product Views', 'value', t.product_views, 'rate', CASE WHEN t.visitors > 0 THEN t.product_views::numeric / t.visitors ELSE 0 END),
          jsonb_build_object('label', 'Add to Cart', 'value', t.add_to_cart, 'rate', CASE WHEN t.product_views > 0 THEN t.add_to_cart::numeric / t.product_views ELSE 0 END),
          jsonb_build_object('label', 'Checkout Starts', 'value', t.checkout_starts, 'rate', CASE WHEN t.add_to_cart > 0 THEN t.checkout_starts::numeric / t.add_to_cart ELSE 0 END),
          jsonb_build_object('label', 'Purchases', 'value', t.purchases, 'rate', CASE WHEN t.checkout_starts > 0 THEN t.purchases::numeric / t.checkout_starts ELSE 0 END)
        )
      ),
      'storeSummaries', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'storeId', store_id, 'visitors', visitors, 'sessions', sessions, 'searches', searches,
        'pageViews', page_views, 'addToCart', add_to_cart, 'checkoutStarts', checkout_starts,
        'purchases', purchases, 'revenue', revenue
      ) ORDER BY revenue DESC, purchases DESC, add_to_cart DESC, page_views DESC) FROM store_summaries), '[]'::jsonb),
      'blogArticles', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'slug', slug, 'views', views, 'ctaClicks', cta_clicks, 'productViews', product_views,
        'carts', carts, 'checkouts', checkouts, 'orders', orders, 'revenue', revenue
      ) ORDER BY revenue DESC, views DESC) FROM blog_articles), '[]'::jsonb)
    )
    FROM event_totals t CROSS JOIN revenue_totals r CROSS JOIN repeat_customers rc
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_store_analytics_report(uuid[], timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_analytics_report(uuid[], timestamptz, timestamptz) TO authenticated, service_role;
