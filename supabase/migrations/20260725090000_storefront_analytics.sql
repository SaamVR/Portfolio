CREATE TABLE IF NOT EXISTS public.store_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  visitor_id text,
  session_id text,
  event_name text NOT NULL,
  event_category text NOT NULL DEFAULT 'engagement',
  page_path text,
  page_type text,
  referrer text,
  traffic_source text,
  traffic_medium text,
  traffic_campaign text,
  traffic_term text,
  traffic_content text,
  search_query text,
  order_number text,
  quantity integer,
  value integer,
  currency_code text NOT NULL DEFAULT 'BDT',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store staff can view analytics events" ON public.store_analytics_events;
CREATE POLICY "Store staff can view analytics events"
  ON public.store_analytics_events FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_store_analytics_events_store_time
  ON public.store_analytics_events(store_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_store_analytics_events_store_name
  ON public.store_analytics_events(store_id, event_name, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_store_analytics_events_store_page
  ON public.store_analytics_events(store_id, page_type, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_store_analytics_events_store_search
  ON public.store_analytics_events(store_id, search_query, event_timestamp DESC)
  WHERE search_query IS NOT NULL;
